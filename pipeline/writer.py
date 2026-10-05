"""Written analysis for a game page, generated from its facts file.

Deterministic data-to-text: every number comes from build_display(), which
formats the saved facts (model output and NCAA.com results). The trace check
in pages.py re-runs build_display() and rejects any number in the prose that
is not in it. Wording varies by match (picked from the match id), never by
chance, so a re-run writes the same page.

House voice: nerdy, conversational, confident about the math and honest about
the uncertainty. No hype words, no guarantees, no dashes (the content lint
enforces both).
"""
from __future__ import annotations

import hashlib
import re

from . import fmt


def _pick(options: list[str], key: str, salt: str) -> str:
    h = int(hashlib.sha256(f"{key}:{salt}".encode()).hexdigest(), 16)
    return options[h % len(options)]


def build_display(f: dict, tz: str) -> dict:
    """Every string the prose may use. Pure function of the facts."""
    home_fav = f["p_home"] >= 0.5
    fav, dog = (f["home"], f["away"]) if home_fav else (f["away"], f["home"])
    p_fav = f["p_home"] if home_fav else 1 - f["p_home"]
    s = f["sets"]
    fs, ds = ("home", "away") if home_fav else ("away", "home")
    p_fav_sweep = s[f"{fs}_3_0"]
    top_key = max(s, key=lambda k: (s[k], k))
    top_side = f["home"] if top_key.startswith("home") else f["away"]
    neutral_fav = f["p_home_neutral"] if home_fav else 1 - f["p_home_neutral"]

    def team(t: dict) -> dict:
        return {
            "name": t["name"],
            "conf": t["conference_name"],
            "rec": fmt.record(t["wins"], t["losses"]),
            "sets": fmt.record(t["sets_won"], t["sets_lost"]),
            "last5": t["last5"],
            "rating": fmt.signed(t["rating"]),
            "rank": fmt.ordinal(t["rank"]),
            "vs_avg": fmt.pct(t["match_win_vs_avg"]),
            "sos": fmt.ordinal(t["sos_rank"]) if t.get("sos_rank") else "",
            "avca": f"No. {t['avca_rank']}" if t.get("avca_rank") else "",
        }

    h2h = []
    for m in f["h2h"]:
        won_home = m["home_sets"] > m["away_sets"]
        h2h.append({
            "date": fmt.short_date(m["date"]),
            "winner": m["home_name"] if won_home else m["away_name"],
            "score": f"{max(m['home_sets'], m['away_sets'])}-{min(m['home_sets'], m['away_sets'])}",
            "host": m["home_name"],
        })
    return {
        "fav": team(fav),
        "dog": team(dog),
        "home_is_fav": home_fav,
        "home": f["home"]["name"],
        "away": f["away"]["name"],
        "p_fav": fmt.pct(p_fav),
        "p_dog": fmt.pct(1 - p_fav),
        "fair_fav": fmt.american(f["fair_home"] if home_fav else f["fair_away"]),
        "fair_dog": fmt.american(f["fair_away"] if home_fav else f["fair_home"]),
        "top_score": f"3-{top_key[-1]}",
        "top_winner": top_side["name"],
        "p_top": fmt.pct(s[top_key]),
        "p_fav_sweep": fmt.pct(p_fav_sweep),
        "p_dog_set": fmt.pct(1 - p_fav_sweep),
        "p_five": fmt.pct(s["home_3_2"] + s["away_3_2"]),
        "home_pts": fmt.pts(f["p_home"] - f["p_home_neutral"]),
        "neutral_fav": fmt.pct(neutral_fav),
        "n_teams": str(f["n_teams"]),
        "date_long": fmt.long_date(f["date"]),
        "date_short": fmt.short_date(f["date"]),
        "time": fmt.start_time(f["start"], f["start_known"], tz),
        "h2h": h2h,
        "age": "21+",
    }


def title_for(d: dict) -> str:
    return f"{d['away']} vs {d['home']} Volleyball Prediction, {d['date_short']}"


def description_for(d: dict) -> str:
    fav = d["fav"]["name"]
    options = [
        f"{d['away']} at {d['home']}, {d['date_short']}: our model has {fav} winning {d['p_fav']} of the time. Set-score odds, fair lines and the inputs behind it.",
        f"{d['away']} at {d['home']}, {d['date_short']}: our model has {fav} winning {d['p_fav']} of the time, with set-score odds and fair lines.",
        f"{d['away']} at {d['home']}: {fav} wins {d['p_fav']} of the time in our model. Set-score odds and fair lines.",
    ]
    for o in options:
        if 70 <= len(o) <= 160:
            return o
    return options[-1][:160]


def body_for(d: dict, key: str) -> str:
    fav, dog = d["fav"], d["dog"]
    p = float(d["p_fav"].rstrip("%"))
    out: list[str] = []

    out.append("## The number")
    if p < 60:
        lead = _pick([
            f"Call this one close to a coin flip with a lean. {fav['name']} wins {d['p_fav']} of the time in our model and {dog['name']} wins the other {d['p_dog']}.",
            f"The model barely picks a side here: {fav['name']} {d['p_fav']}, {dog['name']} {d['p_dog']}.",
        ], key, "lead-close")
    elif p < 80:
        lead = _pick([
            f"{fav['name']} is the favorite at {d['p_fav']}, which leaves {dog['name']} a live {d['p_dog']}.",
            f"Our number: {fav['name']} {d['p_fav']}, {dog['name']} {d['p_dog']}. A real favorite, not a formality.",
        ], key, "lead-mid")
    else:
        lead = _pick([
            f"The model is not sweating this one. {fav['name']} wins {d['p_fav']} of the time and {dog['name']} gets {d['p_dog']}.",
            f"Heavy chalk: {fav['name']} at {d['p_fav']}, {dog['name']} at {d['p_dog']}.",
        ], key, "lead-big")
    out.append(
        f"{lead} Turned into a price with no vig, that is {d['fair_fav']} on {fav['name']} and {d['fair_dog']} on {dog['name']}. "
        f"The single most likely result is {d['top_winner']} {d['top_score']} ({d['p_top']}), and {dog['name']} takes at least one set {d['p_dog_set']} of the time."
    )

    out.append(f"## Why the model leans {fav['name']}")
    out.append(_pick([
        "Three inputs set this number, and here they are:",
        "The whole forecast comes from three inputs:",
    ], key, "inputs"))
    out.append(
        f"- **{fav['name']} rating: {fav['rating']}**, {fav['rank']} of {d['n_teams']} D1 teams. That beats an average D1 team on a neutral floor {fav['vs_avg']} of the time.\n"
        f"- **{dog['name']} rating: {dog['rating']}**, {dog['rank']} of {d['n_teams']}. Against that same average team: {dog['vs_avg']}.\n"
        + (
            f"- **Home court: {d['home_pts']} percentage points** for {d['home']}. On a neutral floor, {fav['name']} would win {d['neutral_fav']} of the time."
            if d["home_is_fav"]
            else f"- **Home court: {d['home_pts']} percentage points** for {d['home']}, which is why this is not higher. On a neutral floor, {fav['name']} would win {d['neutral_fav']} of the time."
        )
    )

    out.append("## Form check")

    def form(t: dict) -> str:
        sos = f" Their strength of schedule ranks {t['sos']}." if t["sos"] else ""
        poll = f" They sit at {t['avca']} in the AVCA poll." if t["avca"] else ""
        return f"{t['name']} is {t['rec']} against D1 opponents with a {t['sets']} set record (last five: {t['last5']}).{sos}{poll}"

    out.append(f"{form(fav)} {form(dog)}")
    if d["h2h"]:
        meets = "; ".join(f"{m['winner']} won {m['score']} on {m['date']} at {m['host']}" for m in d["h2h"])
        out.append(f"They have already met this season: {meets}. The model counts that result like any other match, no extra weight.")
    else:
        out.append("This is their first meeting of the season, so there is no head-to-head in the sample. The model does not need one: every D1 result connects the two teams through common opponents.")
    out.append("Every result above comes from the NCAA.com scoreboard, linked in the tables on this page.")

    out.append("## How this goes wrong")
    out.append(
        f"{dog['name']} wins outright {d['p_dog']} of the time, and the match goes the full five sets {d['p_five']} of the time. "
        + _pick([
            "The model only knows this season's set results, who they came against and where. It knows nothing about injuries, lineup changes, travel or a setter having an off night, so treat the number as the baseline the news has to move.",
            "It is a ratings model, not a scout. It sees set results, opponents and home court, and nothing about injuries, rotations or travel. If you know something it doesn't, adjust from here.",
        ], key, "limits")
    )

    out.append("## Odds and the fine print")
    out.append(
        "We do not quote sportsbook or prediction-market prices yet, so this page makes no bet call. "
        "The fair lines are the model's probability converted to American odds with no vig. "
        f"This prediction was logged before first serve and gets graded on the results page, win or lose. {d['age']} only. Outcomes are uncertain, and nothing here is betting advice."
    )
    # A team name that ends in a period ("Penn St.") must not end a sentence with two.
    return re.sub(r"\.\.(?=[\s)]|$)", ".", "\n\n".join(out)) + "\n"
