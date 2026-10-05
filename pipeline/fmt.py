"""Number and date formatting shared by the writer and the trace check.

The trace check re-runs these on the raw facts and compares, so every number
in generated prose provably comes from saved model output or source data.
"""
from __future__ import annotations

import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
NUMBER = re.compile(r"\d+(?:\.\d+)?")


def pct(p: float) -> str:
    return f"{p * 100:.1f}%"


def pts(x: float) -> str:
    """Percentage points, unsigned."""
    return f"{abs(x) * 100:.1f}"


def signed(x: float, places: int = 2) -> str:
    return f"{x:+.{places}f}"


def american(n: int) -> str:
    return f"{n:+d}" if n > 0 else str(n)


def ordinal(n: int) -> str:
    suffix = "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def short_date(iso_date: str) -> str:
    d = date.fromisoformat(iso_date)
    return f"{MONTHS[d.month - 1]} {d.day}"


def long_date(iso_date: str) -> str:
    d = date.fromisoformat(iso_date)
    return f"{DAYS[d.weekday()]}, {MONTHS[d.month - 1]} {d.day}, {d.year}"


def start_time(iso_start: str | None, known: bool, tz: str) -> str:
    if not known or not iso_start:
        return "time to be announced"
    dt = datetime.fromisoformat(iso_start.replace("Z", "+00:00")).astimezone(ZoneInfo(tz))
    h = dt.hour % 12 or 12
    suffix = "a.m." if dt.hour < 12 else "p.m."
    return f"{h}:{dt.minute:02d} {suffix} ET"


def record(w: int, l: int) -> str:
    return f"{w}-{l}"


def numbers_in(text: str) -> list[str]:
    return NUMBER.findall(text)
