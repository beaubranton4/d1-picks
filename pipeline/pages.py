"""Gated game pages: which matches get their own URL, and the page files.

A match becomes a page only when ALL of these hold (strategy section 6.2):
  1. Both teams have at least game_pages.min_d1_matches D1 matches.
  2. At least one qualifier: postseason; a matchup with measured search
     demand (keyword map); both teams AVCA-ranked; both in our top N.
     (The strategy also lists "national TV" and "a model edge against a real
     market price". NCAA.com carries no broadcast data, and we quote no
     prices, so neither can qualify a match today.)
  3. The page is complete: prediction, set-score odds, three inputs, form
     and head-to-head from saved results, and prose that passes the number
     trace check and the content rules.
Then the caps: at most max_game_pages_per_sport_per_day per sport and
max_game_pages_site_per_day across sports, counted by selection date, and
nothing at all while publishing.json game_pages_enabled is false.

Outputs per page:
  data/<sport>/games/<slug>.json            facts (saved model output + source data)
  content/<sport>-games/<slug>.mdx          frontmatter + generated analysis
  data/<sport>/game-pages.json              append-only selection log
"""
from __future__ import annotations

import re
from datetime import datetime

import yaml  # type: ignore[import-untyped]

from . import fmt, model, writer
from .common import CONTENT, DATA, iso, load_json, sport_dir, write_json
from .ledger import all_rows, lock_deadline

AUTHOR = "beau-branton"
# Words the content lint (site.config.json contentRules + the kit list) would reject; checked here first
# so a page that would fail the lint is never written.
BANNED = [
    "lock", "guarantee", "can't lose", "cannot lose", "back up the truck", "sure thing", "free money", "max bet",
    "unlock", "game changer", "delve", "seamless", "in conclusion",
]


def games_dir(cfg: dict):
    return sport_dir(cfg["sport"]) / "games"


def mdx_dir(cfg: dict):
    return CONTENT / f"{cfg['sport']}-games"


def selection_log(cfg: dict) -> list[dict]:
    return load_json(sport_dir(cfg["sport"]) / "game-pages.json", [])


def slug_for(p: dict) -> str:
    return f"{p['away']}-vs-{p['home']}-{p['date']}"


def _qualifiers(cfg: dict, p: dict) -> tuple[list[str], tuple]:
    g = cfg["game_pages"]
    reasons = []
    prio = (9, 0)
    if p.get("postseason"):
        reasons.append("NCAA tournament match")
        prio = min(prio, (0, 0))
    pair = {p["home"], p["away"]}
    for kw in g["keyword_matchups"]["pairs"]:
        if set(kw["teams"]) == pair:
            reasons.append(f"search demand: \"{kw['keyword']}\", {kw['volume']} searches a month")
            prio = min(prio, (1, -kw["volume"]))
    if p.get("home_avca") and p.get("away_avca"):
        reasons.append(f"both AVCA-ranked (No. {p['away_avca']} and No. {p['home_avca']})")
        prio = min(prio, (2, p["home_avca"] + p["away_avca"]))
    if p["home_rank"] <= g["our_top_n"] and p["away_rank"] <= g["our_top_n"]:
        reasons.append(f"both in our top {g['our_top_n']} ({fmt.ordinal(p['away_rank'])} and {fmt.ordinal(p['home_rank'])})")
        prio = min(prio, (3, p["home_rank"] + p["away_rank"]))
    return reasons, prio


def _team_facts(t: dict, recent: list[dict]) -> dict:
    keep = ("id", "name", "conference_name", "rank", "rating", "match_win_vs_avg", "wins", "losses", "sets_won", "sets_lost",
            "last5", "sos_rank", "avca_rank", "d1_matches")
    return {**{k: t.get(k) for k in keep}, "recent": recent}


def _recent(store: dict, team: str, through: str, n: int = 5) -> list[dict]:
    rows = []
    for c in store["contests"]:
        if not c["d1"] or c["state"] != "final" or c["date"] > through or team not in (c["home"], c["away"]):
            continue
        hs, as_ = c["home_sets"], c["away_sets"]
        if max(hs, as_) != 3 or min(hs, as_) > 2:
            continue
        home = c["home"] == team
        opp = c["away"] if home else c["home"]
        rows.append({
            "date": c["date"], "opponent": opp, "opponent_name": store["teams"][opp]["name"], "home": home,
            "won": (hs > as_) == home, "sets_for": hs if home else as_, "sets_against": as_ if home else hs, "url": c["url"],
        })
    return rows[-n:]


def build_facts(cfg: dict, store: dict, p: dict, selected_on: str, reasons: list[str]) -> dict:
    snap = load_json(sport_dir(cfg["sport"]) / "ratings" / f"{p['ratings_as_of']}.json")
    teams = {t["id"]: t for t in snap["teams"]}
    through = snap["params"]["results_through"]
    h2h = []
    for c in store["contests"]:
        if c["d1"] and c["state"] == "final" and c["date"] <= through and {c["home"], c["away"]} == {p["home"], p["away"]}:
            h2h.append({"date": c["date"], "home": c["home"], "away": c["away"], "home_name": store["teams"][c["home"]]["name"],
                        "away_name": store["teams"][c["away"]]["name"], "home_sets": c["home_sets"], "away_sets": c["away_sets"], "url": c["url"]})
    neutral = model.predict(p["r_home"], p["r_away"], p["home_logit"], p["calibration_scale"], neutral=True)
    return {
        "slug": slug_for(p),
        "sport": cfg["sport"],
        "season": cfg["season"],
        "match_id": p["match_id"],
        "prediction_id": p["id"],
        "predicted_at": p["predicted_at"],
        "date": p["date"],
        "start": p["start"],
        "start_known": p["start_known"],
        "url": p["url"],
        "selected_on": selected_on,
        "reasons": reasons,
        "model": p["model"],
        "ratings_as_of": p["ratings_as_of"],
        "n_teams": snap["params"]["teams"],
        "home": _team_facts(teams[p["home"]], _recent(store, p["home"], through)),
        "away": _team_facts(teams[p["away"]], _recent(store, p["away"], through)),
        "p_home": p["p_home"],
        "sets": p["sets"],
        "fair_home": p["fair_home"],
        "fair_away": p["fair_away"],
        "p_home_neutral": round(neutral["p_home"], 4),
        "h2h": h2h,
    }


def _flatten(x) -> list[str]:
    if isinstance(x, dict):
        return [s for v in x.values() for s in _flatten(v)]
    if isinstance(x, list):
        return [s for v in x for s in _flatten(v)]
    return [str(x)] if x is not None and not isinstance(x, bool) else []


def trace_problems(text: str, display: dict) -> list[str]:
    """Numbers in `text` that do not appear in the formatted facts."""
    allowed = {n for s in _flatten(display) for n in fmt.numbers_in(s)}
    clean = re.sub(r"\bD1\b", "", text)
    return sorted({n for n in fmt.numbers_in(clean) if n not in allowed})


def copy_problems(text: str) -> list[str]:
    out = []
    if "—" in text or "–" in text:
        out.append("contains an em or en dash")
    low = text.lower()
    for w in BANNED:
        if re.search(rf"\b{re.escape(w)}(s|es|ed|d|ing)?\b", low):
            out.append(f"banned phrase \"{w}\"")
    return out


def render_mdx(facts: dict, display: dict) -> tuple[str, str, str, str]:
    title = writer.title_for(display)
    desc = writer.description_for(display)
    body = writer.body_for(display, facts["match_id"])
    front = {
        "title": title,
        "description": desc,
        "publishDate": facts["selected_on"],
        "author": AUTHOR,
        "tags": [facts["sport"], "game-prediction"],
        "matchId": facts["match_id"],
        "generated": True,
    }
    mdx = "---\n" + yaml.safe_dump(front, sort_keys=False, allow_unicode=True) + "---\n\n" + body
    return title, desc, body, mdx


def check_page(cfg: dict, facts: dict, mdx_text: str | None = None) -> list[str]:
    """Completeness (6.1) and the number trace. Used before writing and by `run check`."""
    problems = []
    if not facts["home"]["recent"] or not facts["away"]["recent"]:
        problems.append("missing recent form")
    if len(facts["sets"]) != 6:
        problems.append("missing set-score distribution")
    # Facts must match the ledger entry they claim to come from.
    pred = next((x for x in all_rows(cfg, "predictions") if x["id"] == facts["prediction_id"]), None)
    if pred is None:
        problems.append(f"prediction {facts['prediction_id']} is not in the ledger")
    else:
        for k in ("p_home", "sets", "fair_home", "fair_away", "match_id", "date", "home", "away"):
            fv = facts[k] if k not in ("home", "away") else facts[k]["id"]
            if fv != pred[k]:
                problems.append(f"facts.{k} does not match the ledger")
    display = writer.build_display(facts, cfg["timezone"])
    title, desc, body, mdx = render_mdx(facts, display)
    text = mdx_text if mdx_text is not None else mdx
    for n in trace_problems(text.split("---", 2)[-1] + "\n" + title + "\n" + desc, display):
        problems.append(f"number {n} does not trace to the facts file")
    if mdx_text is not None:
        fm = yaml.safe_load(mdx_text.split("---", 2)[1])
        for n in trace_problems(f"{fm.get('title', '')}\n{fm.get('description', '')}", display):
            problems.append(f"number {n} in the frontmatter does not trace to the facts file")
    problems += copy_problems(text)
    if not 70 <= len(desc) <= 160:
        problems.append(f"description is {len(desc)} chars")
    return problems


def select_and_write(cfg: dict, pub: dict, store: dict, now: datetime, today: str, log=print) -> list[dict]:
    if not pub.get("game_pages_enabled"):
        log("  game pages: kill switch is off (publishing.json game_pages_enabled=false)")
        return []
    sel = selection_log(cfg)
    have = {s["slug"] for s in sel}
    sport_today = sum(1 for s in sel if s["selected_on"] == today)
    site_today = 0
    for f in DATA.glob("*/game-pages.json"):
        site_today += sum(1 for s in load_json(f, []) if s["selected_on"] == today)
    room = min(pub["max_game_pages_per_sport_per_day"] - sport_today, pub["max_game_pages_site_per_day"] - site_today)
    min_m = cfg["game_pages"]["min_d1_matches"]
    graded = {g["prediction_id"] for g in all_rows(cfg, "grades")}
    cands = []
    for p in all_rows(cfg, "predictions"):
        if slug_for(p) in have or p["id"] in graded or lock_deadline(p, cfg["timezone"]) <= now:
            continue
        if p["home_d1_matches"] < min_m or p["away_d1_matches"] < min_m:
            continue
        reasons, prio = _qualifiers(cfg, p)
        if reasons:
            cands.append((prio, p["start"] or "", p, reasons))
    cands.sort(key=lambda x: (x[0], x[1]))
    written = []
    for prio, _, p, reasons in cands:
        if room <= 0:
            log(f"  game pages: daily cap reached, {len(cands) - len(written)} qualifying match(es) stay hub rows")
            break
        facts = build_facts(cfg, store, p, today, reasons)
        problems = check_page(cfg, facts)
        if problems:
            log(f"  game page {facts['slug']} rejected: {problems}")
            continue
        display = writer.build_display(facts, cfg["timezone"])
        _, _, _, mdx = render_mdx(facts, display)
        write_json(games_dir(cfg) / f"{facts['slug']}.json", facts)
        path = mdx_dir(cfg) / f"{facts['slug']}.mdx"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(mdx)
        entry = {"slug": facts["slug"], "match_id": p["match_id"], "prediction_id": p["id"], "selected_on": today,
                 "selected_at": iso(now), "reasons": reasons}
        sel.append(entry)
        written.append(entry)
        room -= 1
        log(f"  game page: {facts['slug']} ({'; '.join(reasons)})")
    write_json(sport_dir(cfg["sport"]) / "game-pages.json", sel)
    return written


def verify_pages(cfg: dict, pub: dict) -> list[str]:
    problems = []
    sel = selection_log(cfg)
    per_day: dict[str, int] = {}
    for s in sel:
        per_day[s["selected_on"]] = per_day.get(s["selected_on"], 0) + 1
        facts = load_json(games_dir(cfg) / f"{s['slug']}.json")
        mdx = mdx_dir(cfg) / f"{s['slug']}.mdx"
        if facts is None or not mdx.exists():
            problems.append(f"{s['slug']}: facts or MDX file missing")
            continue
        problems += [f"{s['slug']}: {x}" for x in check_page(cfg, facts, mdx.read_text())]
    for day, n in per_day.items():
        if n > pub["max_game_pages_per_sport_per_day"]:
            problems.append(f"{day}: {n} {cfg['sport']} game pages (cap {pub['max_game_pages_per_sport_per_day']})")
    for f in sorted(mdx_dir(cfg).glob("*.mdx")) if mdx_dir(cfg).exists() else []:
        if f.stem not in {s["slug"] for s in sel}:
            problems.append(f"{f.name}: not in game-pages.json (pages are only created by the pipeline)")
    return problems
