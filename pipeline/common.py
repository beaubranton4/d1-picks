"""Paths, config, time and JSON helpers shared by every pipeline step."""
from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = ROOT / "pipeline"
DATA = ROOT / "data"
CONTENT = ROOT / "content"


def load_json(path: Path, default=None):
    if not path.exists():
        return default
    with path.open() as f:
        return json.load(f)


def write_json(path: Path, obj) -> None:
    """Write pretty, stable JSON (sorted only where the caller sorted)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def append_jsonl(path: Path, rows: list[dict]) -> None:
    """Append-only: the only way the pipeline writes to a log."""
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")


def sport_config(sport: str) -> dict:
    return load_json(PIPELINE / "config" / f"{sport}.json")


def publishing_config() -> dict:
    return load_json(PIPELINE / "config" / "publishing.json")


def sport_dir(sport: str) -> Path:
    return DATA / sport


def utc_now() -> datetime:
    """The pipeline's clock. D1PICKS_NOW (ISO, with offset) pins it for tests."""
    pinned = os.environ.get("D1PICKS_NOW")
    if pinned:
        return datetime.fromisoformat(pinned).astimezone(timezone.utc)
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def local_today(tz: str) -> date:
    return utc_now().astimezone(ZoneInfo(tz)).date()


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)
