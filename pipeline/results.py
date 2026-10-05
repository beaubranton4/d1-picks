"""Season results store: data/<sport>/results-<season>.json.

This is the saved source data every rating, prediction and grade traces back
to. One row per NCAA.com contest, with the NCAA.com game URL it came from.
Re-fetching a date replaces that date's rows; a contest that vanished from a
re-fetched date is kept and marked "removed" so nothing disappears silently.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from . import ncaa
from .common import iso, load_json, sport_dir, utc_now, write_json

STATE = {"F": "final", "P": "scheduled", "I": "live", "L": "live", "C": "canceled", "X": "canceled", "D": "postponed", "S": "suspended"}


def results_path(cfg: dict):
    return sport_dir(cfg["sport"]) / f"results-{cfg['season']}.json"


def load_results(cfg: dict) -> dict:
    return load_json(
        results_path(cfg),
        {
            "sport": cfg["sport"],
            "season": cfg["season"],
            "source": cfg["source"],
            "updated_at": None,
            "teams": {},
            "contests": [],
        },
    )


def _state(c: dict) -> str:
    text = " ".join(str(c.get(k) or "") for k in ("statusCodeDisplay", "finalMessage")).lower()
    if "cancel" in text:
        return "canceled"
    if "postpon" in text:
        return "postponed"
    return STATE.get(c.get("gameState") or "", (c.get("gameState") or "unknown").lower())


def normalize(raw: dict, cfg: dict) -> tuple[dict, dict]:
    """(contest row, {team id: team info}) from one raw NCAA.com contest."""
    d1 = cfg["d1_conferences"]
    teams = {}
    side = {}
    for t in raw.get("teams") or []:
        tid = t.get("seoname")
        if not tid:
            continue
        conf = t.get("conferenceSeo")
        teams[tid] = {"name": t.get("nameShort") or tid, "conference": conf, "d1": conf in d1}
        side["home" if t.get("isHome") else "away"] = t
    home, away = side.get("home"), side.get("away")
    if not home or not away:
        return None, teams
    m, dd, yyyy = (raw.get("startDate") or "").split("/")
    epoch = raw.get("startTimeEpoch")
    start = iso(datetime.fromtimestamp(int(epoch), tz=timezone.utc)) if epoch else None
    state = _state(raw)
    final = state == "final"
    row = {
        "id": str(raw["contestId"]),
        "date": f"{yyyy}-{m}-{dd}",
        "start": start,
        "start_known": bool(raw.get("hasStartTime")) and not raw.get("tba"),
        "state": state,
        "home": home["seoname"],
        "away": away["seoname"],
        "home_sets": home.get("score") if final else None,
        "away_sets": away.get("score") if final else None,
        "home_rank": home.get("teamRank") or None,
        "away_rank": away.get("teamRank") or None,
        "d1": bool(teams[home["seoname"]]["d1"] and teams[away["seoname"]]["d1"]),
        "postseason": bool(raw.get("isChampionship") or raw.get("championshipId")),
        "url": "https://www.ncaa.com" + (raw.get("url") or f"/game/{raw['contestId']}"),
    }
    return row, teams


def refresh(cfg: dict, dates: list[date], log=print) -> dict:
    """Fetch the given dates from NCAA.com and merge them into the store."""
    store = load_results(cfg)
    by_id = {c["id"]: c for c in store["contests"]}
    src = cfg["source"]
    unknown_conf: dict[str, int] = {}
    for d in dates:
        raw = ncaa.fetch_contests(src["sport_code"], src["sport_url"], cfg["season"], d)
        seen = set()
        for rc in raw:
            row, teams = normalize(rc, cfg)
            for tid, info in teams.items():
                prev = store["teams"].get(tid, {})
                store["teams"][tid] = {**prev, "name": info["name"], "conference": info["conference"], "d1": info["d1"]}
                if not info["d1"]:
                    unknown_conf[info["conference"] or "none"] = unknown_conf.get(info["conference"] or "none", 0) + 1
            if row:
                seen.add(row["id"])
                by_id[row["id"]] = row
        ds = d.isoformat()
        for c in by_id.values():
            if c["date"] == ds and c["id"] not in seen and c["state"] != "removed":
                c["state"] = "removed"
        log(f"  {ds}: {len(raw)} contests")
    store["contests"] = sorted(by_id.values(), key=lambda c: (c["date"], c["start"] or "", c["id"]))
    store["updated_at"] = iso(utc_now())
    write_json(results_path(cfg), store)
    if unknown_conf:
        log(f"  non-D1 opponents by conference: {dict(sorted(unknown_conf.items()))}")
    return store


def d1_finals(store: dict, before: str | None = None) -> list[dict]:
    """Completed D1-vs-D1 best-of-five matches, optionally only those dated before `before`."""
    out = []
    for c in store["contests"]:
        if not c["d1"] or c["state"] != "final" or c["home_sets"] is None:
            continue
        if before and c["date"] >= before:
            continue
        hs, as_ = c["home_sets"], c["away_sets"]
        if max(hs, as_) != 3 or min(hs, as_) > 2:
            continue  # not a completed best-of-five
        out.append(c)
    return out


def fetch_window(cfg: dict, today: date, back_days: int = 7) -> list[date]:
    """Dates the daily job re-reads: the past week (late finals) through the prediction window."""
    ahead = cfg["predictions"]["window_days"] - 1
    start = max(date.fromisoformat(cfg["season_start"]), today - timedelta(days=back_days))
    end = min(date.fromisoformat(cfg["season_end"]), today + timedelta(days=ahead))
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]
