"""D1 Picks pipeline CLI. Run from the repo root.

    python -m pipeline.run daily [--sport volleyball] [--no-fetch]
        The daily job: fetch results, backtest and calibrate, rate, grade,
        predict, select and write game pages, write the manifest, then run
        every check. Safe to re-run the same day.
    python -m pipeline.run backfill [--sport volleyball]
        Fetch every date from season_start through the prediction window.
    python -m pipeline.run regrade [--sport volleyball] --back-days 21
        One-off catch-up for predictions stranded past the daily job's
        7-day lookback: re-fetch the past N days of results (through today),
        then append grades for logged predictions whose match is now final.
        Writes no predictions, ratings or pages. The daily default is unchanged.
    python -m pipeline.run check [--sport volleyball] [--base origin/main]
        Guardrails only, no network: ledger integrity (append-only against
        --base when given), the number trace on every game page, and the
        publishing caps. Exit 1 on any failure.
"""
from __future__ import annotations

import argparse
import pathlib
import sys
from datetime import date, timedelta

from . import backtest, ledger, pages, ratings, results
from .common import DATA, daterange, iso, load_json, local_today, publishing_config, sport_config, sport_dir, utc_now, write_json


def write_manifest(cfg: dict, snap_name: str) -> None:
    d = sport_dir(cfg["sport"])
    rel = lambda p: str(p.relative_to(d))  # noqa: E731
    write_json(d / "manifest.json", {
        "$comment": "Written by the pipeline. The site reads the newest files through this manifest.",
        "sport": cfg["sport"],
        "season": cfg["season"],
        "model": cfg["model"]["version"],
        "updated_at": iso(utc_now()),
        "results": f"results-{cfg['season']}.json",
        "ratings": f"ratings/{snap_name}",
        "backtest": f"backtest-{cfg['season']}.json",
        "predictions": [rel(p) for p in sorted((d / "predictions").glob("*.jsonl"))],
        "grades": [rel(p) for p in sorted((d / "grades").glob("*.jsonl"))],
        "game_pages": "game-pages.json",
    })


def run_checks(cfg: dict, base: str | None) -> list[str]:
    pub = publishing_config()
    problems = [f"ledger: {p}" for p in ledger.verify(cfg, base)]
    problems += [f"game page: {p}" for p in pages.verify_pages(cfg, pub)]
    per_day: dict[str, int] = {}
    for f in DATA.glob("*/game-pages.json"):
        for s in load_json(f, []):
            per_day[s["selected_on"]] = per_day.get(s["selected_on"], 0) + 1
    for day, n in per_day.items():
        if n > pub["max_game_pages_site_per_day"]:
            problems.append(f"caps: {day} has {n} game pages site-wide (cap {pub['max_game_pages_site_per_day']})")
    return problems


def cmd_daily(cfg: dict, fetch: bool) -> int:
    now = utc_now()
    today = local_today(cfg["timezone"])
    print(f"daily {cfg['sport']} {today} (now {iso(now)})")
    if fetch:
        print("fetch:")
        store = results.refresh(cfg, results.fetch_window(cfg, today))
    else:
        store = results.load_results(cfg)

    bt = backtest.run(cfg, store)
    backtest.write(cfg, bt)
    print(f"backtest: {bt['result']['matches']} matches, Brier {bt['result'].get('brier')}, calibration scale {bt['calibration_scale']}")

    # A snapshot that a logged prediction already points at is never rewritten.
    name = f"{today.isoformat()}.json"
    used = any(p["ratings_as_of"] == today.isoformat() for p in ledger.all_rows(cfg, "predictions"))
    path = ratings.ratings_dir(cfg) / name
    if used and path.exists():
        snap = load_json(path)
        print(f"ratings: reusing {path.name} (predictions already reference it)")
    else:
        poll_upto = results.fetch_window(cfg, today)[-1].isoformat()
        snap = ratings.build_snapshot(cfg, store, today.isoformat(), poll_upto, bt["calibration_scale"])
        ratings.write_snapshot(cfg, snap)
        print(f"ratings: {snap['params']['teams']} teams from {snap['params']['matches_used']} matches, home {snap['params']['home_logit']}")

    graded = ledger.grade(cfg, store, now)
    print(f"grades: {len(graded)} new")
    preds = ledger.predict_upcoming(cfg, store, snap, now)
    print(f"predictions: {len(preds)} new")
    written = pages.select_and_write(cfg, publishing_config(), store, now, today.isoformat())
    print(f"game pages: {len(written)} new")
    write_manifest(cfg, name)

    problems = run_checks(cfg, None)
    for p in problems:
        print(f"CHECK FAILED {p}")
    return 1 if problems else 0


def cmd_regrade(cfg: dict, back_days: int) -> int:
    now = utc_now()
    today = local_today(cfg["timezone"])
    first = max(date.fromisoformat(cfg["season_start"]), today - timedelta(days=back_days))
    dates = list(daterange(first, today))
    print(f"regrade {cfg['sport']}: {dates[0]} to {dates[-1]} ({len(dates)} dates)")
    store = results.refresh(cfg, dates)
    graded = ledger.grade(cfg, store, now)
    print(f"grades: {len(graded)} new")
    # The site reads grades through the manifest; keep the current ratings snapshot as is.
    snap_name = pathlib.PurePosixPath(load_json(sport_dir(cfg["sport"]) / "manifest.json")["ratings"]).name
    write_manifest(cfg, snap_name)
    problems = run_checks(cfg, None)
    for p in problems:
        print(f"CHECK FAILED {p}")
    return 1 if problems else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m pipeline.run", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["daily", "backfill", "regrade", "check"])
    ap.add_argument("--sport", default="volleyball")
    ap.add_argument("--no-fetch", action="store_true", help="daily: use the saved results instead of NCAA.com")
    ap.add_argument("--back-days", type=int, help="regrade: how many days of results to re-read (one-off, not saved to config)")
    ap.add_argument("--base", help="check: git ref the ledger must be an append-only extension of")
    args = ap.parse_args(argv)
    cfg = sport_config(args.sport)
    if args.command == "backfill":
        today = local_today(cfg["timezone"])
        dates = list(daterange(date.fromisoformat(cfg["season_start"]), results.fetch_window(cfg, today)[-1]))
        print(f"backfill {cfg['sport']}: {dates[0]} to {dates[-1]} ({len(dates)} dates)")
        results.refresh(cfg, dates)
        return 0
    if args.command == "regrade":
        if not args.back_days:
            ap.error("regrade needs --back-days N")
        return cmd_regrade(cfg, args.back_days)
    if args.command == "daily":
        return cmd_daily(cfg, fetch=not args.no_fetch)
    problems = run_checks(cfg, args.base)
    for p in problems:
        print(f"FAIL {p}")
    print(f"check {cfg['sport']}: {'ok' if not problems else f'{len(problems)} problem(s)'}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
