"""Daily ratings snapshot: data/<sport>/ratings/<YYYY-MM-DD>.json.

One file per day, never rewritten after that day, so any old prediction can be
traced to the ratings it used. The site reads the newest one through
data/<sport>/manifest.json.
"""
from __future__ import annotations

from collections import defaultdict

from . import model
from .common import iso, load_json, sport_dir, utc_now, write_json
from .results import d1_finals


def ratings_dir(cfg: dict):
    return sport_dir(cfg["sport"]) / "ratings"


def latest_snapshot(cfg: dict, before: str | None = None) -> dict | None:
    files = sorted(p for p in ratings_dir(cfg).glob("*.json") if before is None or p.stem < before)
    return load_json(files[-1]) if files else None


def _latest_poll(store: dict, upto: str) -> dict:
    """Each team's AVCA rank from its most recent contest dated on or before `upto`."""
    rank: dict[str, tuple[str, int | None]] = {}
    for c in store["contests"]:
        if c["date"] > upto or c["state"] == "removed":
            continue
        for side in ("home", "away"):
            t = c[side]
            prev = rank.get(t)
            if prev is None or c["date"] >= prev[0]:
                rank[t] = (c["date"], c[f"{side}_rank"])
    return {t: r for t, (_, r) in rank.items()}


def build_snapshot(cfg: dict, store: dict, as_of: str, poll_upto: str, scale: float) -> dict:
    mcfg = cfg["model"]
    finals = d1_finals(store)
    d1_teams = sorted(t for t, info in store["teams"].items() if info.get("d1"))
    fit = model.fit(finals, mcfg["prior_precision"], mcfg["home_prior_precision"], teams=d1_teams)
    r = fit["ratings"]
    home = fit["home"]

    rec = defaultdict(lambda: {"w": 0, "l": 0, "sw": 0, "sl": 0, "opp": [], "games": []})
    for c in finals:
        h, a = c["home"], c["away"]
        hw = c["home_sets"] > c["away_sets"]
        for team, opp, won, s_for, s_against in ((h, a, hw, c["home_sets"], c["away_sets"]), (a, h, not hw, c["away_sets"], c["home_sets"])):
            x = rec[team]
            x["w" if won else "l"] += 1
            x["sw"] += s_for
            x["sl"] += s_against
            x["opp"].append(opp)
            x["games"].append((c["date"], c["start"] or "", "W" if won else "L"))

    sos = {t: (sum(r[o] for o in rec[t]["opp"]) / len(rec[t]["opp"])) if rec[t]["opp"] else None for t in d1_teams}
    poll = _latest_poll(store, poll_upto)
    prev = latest_snapshot(cfg, before=as_of)
    prev_rank = {t["id"]: t["rank"] for t in prev["teams"]} if prev else {}

    order = sorted(d1_teams, key=lambda t: (-r[t], t))
    sos_order = sorted((t for t in d1_teams if sos[t] is not None), key=lambda t: (-sos[t], t))
    sos_rank = {t: i + 1 for i, t in enumerate(sos_order)}
    confs = cfg["d1_conferences"]
    teams = []
    for i, t in enumerate(order):
        x = rec[t]
        vs_avg = model.predict(r[t], 0.0, home, scale, neutral=True)
        games = sorted(x["games"])
        teams.append({
            "id": t,
            "name": store["teams"][t]["name"],
            "conference": store["teams"][t]["conference"],
            "conference_name": confs.get(store["teams"][t]["conference"], store["teams"][t]["conference"]),
            "rank": i + 1,
            "prev_rank": prev_rank.get(t),
            "rating": round(r[t], 4),
            "set_win_vs_avg": round(vs_avg["p_set_home"], 4),
            "match_win_vs_avg": round(vs_avg["p_home"], 4),
            "d1_matches": x["w"] + x["l"],
            "wins": x["w"],
            "losses": x["l"],
            "sets_won": x["sw"],
            "sets_lost": x["sl"],
            "last5": "".join(g[2] for g in games[-5:]),
            "sos": round(sos[t], 4) if sos[t] is not None else None,
            "sos_rank": sos_rank.get(t),
            "avca_rank": poll.get(t),
        })
    even = model.predict(0.0, 0.0, home, scale)
    return {
        "sport": cfg["sport"],
        "season": cfg["season"],
        "model": mcfg["version"],
        "model_name": mcfg["name"],
        "as_of": as_of,
        "generated_at": iso(utc_now()),
        "source": cfg["source"],
        "params": {
            "home_logit": round(home, 4),
            "prior_precision": mcfg["prior_precision"],
            "home_prior_precision": mcfg["home_prior_precision"],
            "calibration_scale": round(scale, 4),
            "matches_used": fit["matches"],
            "teams": len(d1_teams),
            "iterations": fit["iterations"],
            "results_through": max((c["date"] for c in finals), default=None),
        },
        "home_edge": {
            "set_win_even": round(even["p_set_home"], 4),
            "match_win_even": round(even["p_home"], 4),
        },
        "teams": teams,
    }


def write_snapshot(cfg: dict, snap: dict):
    path = ratings_dir(cfg) / f"{snap['as_of']}.json"
    write_json(path, snap)
    return path
