"""Walk-forward backtest: data/<sport>/backtest-<season>.json.

For each match day, fit the model on results from earlier days only, predict
that day's D1 matches, then score the predictions. No look-ahead anywhere:
the calibration scale used on a day is also fit only on earlier days'
out-of-sample predictions. This is a backtest, labeled as one everywhere it
appears, and it never counts toward the live record in /results.

It also produces the live calibration scale: the scale fit on every
out-of-sample prediction so far, which the daily ratings use.
"""
from __future__ import annotations

import statistics
from collections import Counter, defaultdict

from . import model
from .common import iso, sport_dir, utc_now, write_json
from .results import d1_finals

BUCKETS = [(0.5, 0.6), (0.6, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.0001)]


def walk_forward(finals: list[dict], teams: list[str], lam: float, lam_h: float, min_median: float):
    """Uncalibrated out-of-sample predictions, one per match, in date order."""
    by_date = defaultdict(list)
    for c in finals:
        by_date[c["date"]].append(c)
    out = []
    train: list[dict] = []
    for d in sorted(by_date):
        counts = Counter()
        for c in train:
            counts[c["home"]] += 1
            counts[c["away"]] += 1
        if train and statistics.median(counts.values()) >= min_median:
            fit = model.fit(train, lam, lam_h, teams=teams)
            r, h = fit["ratings"], fit["home"]
            for c in by_date[d]:
                p_set = model.set_probability(r[c["home"]], r[c["away"]], h)
                out.append({"date": d, "match_id": c["id"], "p_home": model.match_probability(p_set), "home_won": c["home_sets"] > c["away_sets"]})
        train.extend(by_date[d])
    return out


def calibrate_walk_forward(raw: list[dict]) -> list[dict]:
    """Calibrate each day with a scale fit only on earlier days' predictions."""
    out = []
    for d in sorted({p["date"] for p in raw}):
        k = model.fit_scale([p for p in raw if p["date"] < d])
        for p in raw:
            if p["date"] == d:
                out.append({**p, "p_home": model.calibrate(p["p_home"], k), "scale": k})
    return out


def score(preds: list[dict]) -> dict:
    n = len(preds)
    if not n:
        return {"matches": 0}
    correct = sum((p["p_home"] >= 0.5) == p["home_won"] for p in preds)
    home_wins = sum(p["home_won"] for p in preds)
    ll = sum(model.log_loss(p["p_home"] if p["home_won"] else 1 - p["p_home"]) for p in preds) / n
    br = sum(model.brier(p["p_home"], p["home_won"]) for p in preds) / n
    cal = []
    for lo, hi in BUCKETS:
        rows = [p for p in preds if lo <= max(p["p_home"], 1 - p["p_home"]) < hi]
        if rows:
            fav_won = sum((p["p_home"] >= 0.5) == p["home_won"] for p in rows)
            cal.append({
                "bucket": f"{round(lo * 100)}-{min(round(hi * 100), 100)}",
                "matches": len(rows),
                "avg_predicted": round(sum(max(p["p_home"], 1 - p["p_home"]) for p in rows) / len(rows), 4),
                "favorite_won": round(fav_won / len(rows), 4),
            })
    return {
        "matches": n,
        "favorites_won": correct,
        "accuracy": round(correct / n, 4),
        "brier": round(br, 4),
        "log_loss": round(ll, 4),
        "home_team_won": round(home_wins / n, 4),
        "calibration": cal,
    }


def run(cfg: dict, store: dict) -> dict:
    mcfg = cfg["model"]
    lam_h = mcfg["home_prior_precision"]
    min_median = mcfg["backtest_min_median_matches"]
    finals = d1_finals(store)
    teams = sorted(t for t, info in store["teams"].items() if info.get("d1"))
    grid = []
    chosen = None
    for lam in mcfg["prior_precision_grid"]:
        raw = walk_forward(finals, teams, lam, lam_h, min_median)
        cal = calibrate_walk_forward(raw)
        s = score(cal)
        grid.append({"prior_precision": lam, "matches": s["matches"], "log_loss": s.get("log_loss"), "brier": s.get("brier"), "accuracy": s.get("accuracy")})
        if lam == mcfg["prior_precision"]:
            chosen = (raw, cal, s)
    raw, cal, s = chosen
    live_scale = model.fit_scale(raw)
    return {
        "sport": cfg["sport"],
        "season": cfg["season"],
        "model": mcfg["version"],
        "generated_at": iso(utc_now()),
        "label": "Walk-forward backtest. Not part of the live record.",
        "min_median_matches": min_median,
        "prior_precision": mcfg["prior_precision"],
        "first_day": cal[0]["date"] if cal else None,
        "last_day": cal[-1]["date"] if cal else None,
        "result": s,
        "uncalibrated": {k: v for k, v in score(raw).items() if k != "calibration"},
        "calibration_scale": round(live_scale, 4),
        "calibration_rows": len(raw),
        "baselines": {"coin_flip": {"brier": 0.25, "log_loss": 0.6931}, "home_team": {"accuracy": s.get("home_team_won")}},
        "prior_precision_grid": grid,
    }


def write(cfg: dict, bt: dict):
    path = sport_dir(cfg["sport"]) / f"backtest-{cfg['season']}.json"
    write_json(path, bt)
    return path
