"""NCAA.com scoreboard feed: every D1 contest for a sport and date.

NCAA.com's scoreboard page (https://www.ncaa.com/scoreboard/<sport>/d1/YYYY/MM/DD)
loads its data from a persisted GraphQL query on sdataprod.ncaa.com. We call
that same query, once per date, at most one request per second, and identify
ourselves in the User-Agent. If NCAA.com rotates the query hash, we read the
current one from the scoreboard page instead of guessing.

stats.ncaa.org would be the first choice, but it answers scripted requests
with 403, so it is not used.
"""
from __future__ import annotations

import json
import re
import time
from datetime import date

import requests

FEED = "https://sdataprod.ncaa.com/"
CONTESTS_QUERY = "GetContests_web"
KNOWN_HASH = "4bcb5e6432fa9da365c0c19af01b1f9015cc7eb5c21e7af2dba308784a166df7"
USER_AGENT = "D1PicksBot/1.0 (+https://www.d1picks.com/methodology)"
MIN_INTERVAL_S = 1.0

_session = requests.Session()
_session.headers.update({"User-Agent": USER_AGENT, "Referer": "https://www.ncaa.com/"})
_last_request = 0.0
_hash = KNOWN_HASH


class FeedError(RuntimeError):
    pass


def _get(url: str, params: dict | None = None) -> requests.Response:
    global _last_request
    wait = MIN_INTERVAL_S - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    for attempt in range(3):
        _last_request = time.monotonic()
        try:
            res = _session.get(url, params=params, timeout=30)
        except requests.RequestException as e:
            if attempt == 2:
                raise FeedError(f"{url}: {e}") from e
            time.sleep(2 * (attempt + 1))
            continue
        if res.status_code >= 500 and attempt < 2:
            time.sleep(2 * (attempt + 1))
            continue
        return res
    raise FeedError(f"{url}: gave up")


def scoreboard_page(sport_url: str, d: date) -> str:
    return f"https://www.ncaa.com/scoreboard/{sport_url}/d1/{d:%Y/%m/%d}"


def _discover_hash(sport_url: str, d: date) -> str:
    html = _get(scoreboard_page(sport_url, d)).text
    m = re.search(r"GetContests_web\\u0026extensions=[^\"]*?sha256Hash%22%3A%22([0-9a-f]{64})", html)
    if not m:
        raise FeedError("could not find the GetContests_web query hash on the NCAA.com scoreboard page")
    return m.group(1)


def fetch_contests(sport_code: str, sport_url: str, season: int, d: date) -> list[dict]:
    """Raw NCAA.com contest objects for one date (division I only)."""
    global _hash
    variables = {"sportCode": sport_code, "division": 1, "seasonYear": season, "contestDate": f"{d:%m/%d/%Y}"}
    for attempt in range(2):
        params = {
            "meta": CONTESTS_QUERY,
            "extensions": json.dumps({"persistedQuery": {"version": 1, "sha256Hash": _hash}}, separators=(",", ":")),
            "variables": json.dumps(variables, separators=(",", ":")),
        }
        res = _get(FEED, params)
        if res.status_code != 200:
            raise FeedError(f"NCAA feed {d}: HTTP {res.status_code}")
        body = res.json()
        errors = body.get("errors") or []
        if errors:
            if attempt == 0 and any("PersistedQuery" in json.dumps(e) for e in errors):
                _hash = _discover_hash(sport_url, d)
                continue
            raise FeedError(f"NCAA feed {d}: {errors}")
        return (body.get("data") or {}).get("contests") or []
    raise FeedError(f"NCAA feed {d}: query hash rejected twice")
