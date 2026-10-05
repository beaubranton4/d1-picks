"""The prediction ledger: append-only JSONL, the source of the public record.

data/<sport>/predictions/YYYY-MM.jsonl  one line per prediction, written before first serve
data/<sport>/grades/YYYY-MM.jsonl       one line per graded (or voided) prediction

Rules, all checked by verify():
  - A match gets ONE prediction, locked when it is first logged (up to
    window_days before the match) and never revised.
  - predicted_at is earlier than the scheduled start. A match with no
    published start time must be predicted before 00:00 local on its date.
  - Lines are only ever appended. Nothing is edited or deleted, and nothing
    is backfilled: the record starts at the first logged prediction.
  - A grade references an existing prediction, at most once.
"""
from __future__ import annotations

import subprocess
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from . import model
from .common import ROOT, append_jsonl, iso, parse_iso, read_jsonl, sport_dir


def _dir(cfg: dict, kind: str):
    return sport_dir(cfg["sport"]) / kind


def all_rows(cfg: dict, kind: str) -> list[dict]:
    rows = []
    for p in sorted(_dir(cfg, kind).glob("*.jsonl")):
        rows.extend(read_jsonl(p))
    return rows


def lock_deadline(contest_or_pred: dict, tz: str) -> datetime:
    """The latest moment a prediction for this match may be logged."""
    if contest_or_pred.get("start_known") and contest_or_pred.get("start"):
        return parse_iso(contest_or_pred["start"])
    d = datetime.fromisoformat(contest_or_pred["date"]).date()
    return datetime.combine(d, time(0, 0), tzinfo=ZoneInfo(tz))


def prediction_id(cfg: dict, contest: dict) -> str:
    return f"{cfg['sport'][:2]}-{cfg['season']}-{contest['id']}-{contest['date']}"


def predict_upcoming(cfg: dict, store: dict, snap: dict, now: datetime) -> list[dict]:
    """Log a prediction for every D1 match in the window that has none yet."""
    tz = cfg["timezone"]
    today = now.astimezone(ZoneInfo(tz)).date()
    window = {(today + timedelta(days=i)).isoformat() for i in range(cfg["predictions"]["window_days"])}
    logged = {p["id"] for p in all_rows(cfg, "predictions")}
    teams = {t["id"]: t for t in snap["teams"]}
    params = snap["params"]
    rows = []
    for c in store["contests"]:
        if not c["d1"] or c["state"] != "scheduled" or c["date"] not in window:
            continue
        pid = prediction_id(cfg, c)
        if pid in logged:
            continue
        if lock_deadline(c, tz) <= now:
            continue
        th, ta = teams.get(c["home"]), teams.get(c["away"])
        if not th or not ta:
            continue
        pred = model.predict(th["rating"], ta["rating"], params["home_logit"], params["calibration_scale"])
        p_home = round(pred["p_home"], 4)
        pick = "home" if p_home >= 0.5 else "away"
        rows.append({
            "id": pid,
            "sport": cfg["sport"],
            "season": cfg["season"],
            "match_id": c["id"],
            "date": c["date"],
            "start": c["start"],
            "start_known": c["start_known"],
            "predicted_at": iso(now),
            "home": c["home"],
            "away": c["away"],
            "home_name": th["name"],
            "away_name": ta["name"],
            "p_home": p_home,
            "p_set_home": round(pred["p_set_home"], 4),
            "sets": {k: round(v, 4) for k, v in pred["sets"].items()},
            "pick": pick,
            "pick_p": p_home if pick == "home" else round(1 - p_home, 4),
            "fair_home": model.fair_american(p_home),
            "fair_away": model.fair_american(1 - p_home),
            "model": snap["model"],
            "ratings_as_of": snap["as_of"],
            "home_logit": params["home_logit"],
            "calibration_scale": params["calibration_scale"],
            "r_home": th["rating"],
            "r_away": ta["rating"],
            "home_rank": th["rank"],
            "away_rank": ta["rank"],
            "home_avca": c["home_rank"],
            "away_avca": c["away_rank"],
            "home_d1_matches": th["d1_matches"],
            "away_d1_matches": ta["d1_matches"],
            "postseason": c["postseason"],
            "url": c["url"],
        })
    append_jsonl(_dir(cfg, "predictions") / f"{now:%Y-%m}.jsonl", rows)
    return rows


def grade(cfg: dict, store: dict, now: datetime, void_after_days: int = 3) -> list[dict]:
    """Grade every prediction whose match is final; void canceled or moved matches."""
    graded = {g["prediction_id"] for g in all_rows(cfg, "grades")}
    contests = {c["id"]: c for c in store["contests"]}
    rows = []
    for p in all_rows(cfg, "predictions"):
        if p["id"] in graded:
            continue
        c = contests.get(p["match_id"])
        base = {"prediction_id": p["id"], "match_id": p["match_id"], "graded_at": iso(now), "url": p["url"]}
        overdue = now > lock_deadline(p, cfg["timezone"]) + timedelta(days=void_after_days)
        if c is None:
            if overdue:
                rows.append({**base, "status": "void", "reason": "match no longer on the NCAA.com scoreboard"})
            continue
        if c["date"] != p["date"]:
            rows.append({**base, "status": "void", "reason": f"match moved to {c['date']}"})
            continue
        if c["state"] == "canceled" or (c["state"] in ("postponed", "removed") and overdue):
            rows.append({**base, "status": "void", "reason": f"match {c['state']}"})
            continue
        if c["state"] != "final" or c["home_sets"] is None:
            continue
        hs, as_ = c["home_sets"], c["away_sets"]
        if max(hs, as_) != 3 or min(hs, as_) > 2:
            rows.append({**base, "status": "void", "reason": f"not a completed best-of-five ({hs}-{as_})"})
            continue
        home_won = hs > as_
        winner = "home" if home_won else "away"
        key = f"{winner}_3_{min(hs, as_)}"
        p_winner = p["p_home"] if home_won else round(1 - p["p_home"], 4)
        rows.append({
            **base,
            "status": "graded",
            "home_sets": hs,
            "away_sets": as_,
            "winner": winner,
            "pick": p["pick"],
            "correct": p["pick"] == winner,
            "p_winner": p_winner,
            "brier": round(model.brier(p["p_home"], home_won), 4),
            "log_loss": round(model.log_loss(p_winner), 4),
            "p_set_score": p["sets"][key],
        })
    append_jsonl(_dir(cfg, "grades") / f"{now:%Y-%m}.jsonl", rows)
    return rows


def _git_show(ref: str, rel: str) -> str | None:
    try:
        return subprocess.run(["git", "show", f"{ref}:{rel}"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError:
        return None


def verify(cfg: dict, base: str | None = None) -> list[str]:
    """Ledger invariants. Returns a list of problems (empty means clean)."""
    problems = []
    preds = all_rows(cfg, "predictions")
    ids = [p["id"] for p in preds]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        problems.append(f"duplicate prediction ids: {sorted(dupes)[:5]}")
    for p in preds:
        if parse_iso(p["predicted_at"]) >= lock_deadline(p, cfg["timezone"]):
            problems.append(f"{p['id']}: logged at {p['predicted_at']}, not before first serve")
        if abs(sum(p["sets"].values()) - 1) > 0.002:
            problems.append(f"{p['id']}: set-score probabilities do not sum to 1")
        if abs(sum(v for k, v in p["sets"].items() if k.startswith("home")) - p["p_home"]) > 0.002:
            problems.append(f"{p['id']}: set scores disagree with p_home")
    known = set(ids)
    gids = []
    for g in all_rows(cfg, "grades"):
        gids.append(g["prediction_id"])
        if g["prediction_id"] not in known:
            problems.append(f"grade for unknown prediction {g['prediction_id']}")
    gd = {i for i in gids if gids.count(i) > 1}
    if gd:
        problems.append(f"predictions graded twice: {sorted(gd)[:5]}")
    if base:
        for kind in ("predictions", "grades"):
            for path in sorted(_dir(cfg, kind).glob("*.jsonl")):
                rel = str(path.relative_to(ROOT))
                old = _git_show(base, rel)
                if old is not None and not path.read_text().startswith(old):
                    problems.append(f"{rel}: lines were edited or removed since {base} (the ledger is append-only)")
    return problems
