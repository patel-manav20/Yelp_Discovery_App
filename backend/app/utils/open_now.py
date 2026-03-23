"""Infer local time zone from a search location string and evaluate Yelp-style hours JSON."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo


def tz_for_search_city(city: str | None) -> ZoneInfo:
    """
    Rough IANA zone for the user's ``city`` query (used when filtering DB rows).
    Defaults to America/Los_Angeles for this lab (San Jose default).
    """
    if not city or not str(city).strip():
        return ZoneInfo("America/Los_Angeles")
    c = str(city).strip().lower()
    if ", ca" in c or c.endswith(" ca") or "california" in c:
        return ZoneInfo("America/Los_Angeles")
    if ", ny" in c or c.endswith(" ny") or "new york" in c:
        return ZoneInfo("America/New_York")
    if ", tx" in c or c.endswith(" tx") or "texas" in c:
        return ZoneInfo("America/Chicago")
    if ", fl" in c or c.endswith(" fl") or "florida" in c:
        return ZoneInfo("America/New_York")
    return ZoneInfo("America/Los_Angeles")


def _hhmm_to_minutes(s: str) -> int | None:
    if len(s) != 4 or not s.isdigit():
        return None
    h, m = int(s[:2]), int(s[2:])
    if h > 24 or m > 59:
        return None
    return h * 60 + m


def yelp_hours_open_now(hours: Any, tz: ZoneInfo) -> bool:
    """
    Whether stored ``hours`` (list of {day, start, end, is_overnight} from Yelp) indicates
    open at *current* local time in ``tz``. Unknown / missing hours → not open.
    """
    if not isinstance(hours, list) or not hours:
        return False

    now = datetime.now(tz)
    wday = int(now.weekday())
    now_m = now.hour * 60 + now.minute

    for p in hours:
        if not isinstance(p, dict) or p.get("day") != wday:
            continue
        sm = _hhmm_to_minutes(str(p.get("start") or ""))
        em = _hhmm_to_minutes(str(p.get("end") or ""))
        if sm is None or em is None:
            continue
        overnight = bool(p.get("is_overnight"))
        if overnight:
            if now_m >= sm or now_m < em:
                return True
        elif sm <= now_m < em:
            return True

    prev = (wday - 1) % 7
    for p in hours:
        if not isinstance(p, dict) or p.get("day") != prev or not p.get("is_overnight"):
            continue
        em = _hhmm_to_minutes(str(p.get("end") or ""))
        if em is None:
            continue
        if now_m < em:
            return True

    return False
