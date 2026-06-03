"""
Open-Meteo Marine API + Forecast API client.

Marine API docs: https://open-meteo.com/en/docs/marine-weather-api
Forecast API docs: https://open-meteo.com/en/docs

No API key required.
"""

import asyncio
import logging
import math
import random
import time
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory cache (stale-while-error) + throttle + retry
#
# Open-Meteo rate-limits per source IP. On shared free hosting (Render) the
# IP is shared with other tenants, so api.open-meteo.com frequently returns
# 429 regardless of our own volume. To stay resilient we:
#   1. Throttle outbound calls (1 at a time, with a min interval).
#   2. Retry 429s with exponential backoff + jitter (the per-minute window
#      refills quickly).
#   3. Serve STALE cached data (up to HARD_TTL) if a refresh ultimately fails,
#      so users see slightly-old data instead of an error.
# ---------------------------------------------------------------------------

# key → (fresh_until, hard_until, data)
_cache: dict[str, tuple[float, float, object]] = {}
_cache_lock = asyncio.Lock()

_HARD_TTL = 24 * 3600  # keep last-known-good data for 24h for stale fallback

# Enforce a minimum gap between outbound calls (global throttle).
_throttle_lock: asyncio.Lock | None = None
_last_call_ts: float = 0.0
_MIN_INTERVAL = 0.4  # seconds between outbound Open-Meteo calls


def _get_throttle_lock() -> asyncio.Lock:
    global _throttle_lock
    if _throttle_lock is None:
        _throttle_lock = asyncio.Lock()
    return _throttle_lock


async def _cache_get(key: str, allow_stale: bool = False):
    async with _cache_lock:
        entry = _cache.get(key)
        if not entry:
            return None
        fresh_until, hard_until, data = entry
        now = time.monotonic()
        if now < fresh_until:
            return data
        if allow_stale and now < hard_until:
            return data
    return None


async def _cache_set(key: str, data, ttl_seconds: int):
    async with _cache_lock:
        now = time.monotonic()
        _cache[key] = (now + ttl_seconds, now + _HARD_TTL, data)


async def _get_with_retry(client: httpx.AsyncClient, url: str, params: dict,
                          attempts: int = 4) -> httpx.Response:
    """GET with throttle + exponential backoff on 429 / transient errors."""
    global _last_call_ts
    delay = 0.6
    last_exc: Exception | None = None

    for attempt in range(attempts):
        # Throttle: ensure a minimum gap between outbound calls.
        async with _get_throttle_lock():
            wait = _MIN_INTERVAL - (time.monotonic() - _last_call_ts)
            if wait > 0:
                await asyncio.sleep(wait)
            _last_call_ts = time.monotonic()

        try:
            resp = await client.get(url, params=params)
        except httpx.HTTPError as exc:
            last_exc = exc
            await asyncio.sleep(delay + random.uniform(0, 0.3))
            delay *= 2
            continue

        if resp.status_code == 429:
            last_exc = httpx.HTTPStatusError(
                "429 Too Many Requests", request=resp.request, response=resp
            )
            await asyncio.sleep(delay + random.uniform(0, 0.3))
            delay *= 2
            continue

        resp.raise_for_status()
        return resp

    raise last_exc if last_exc else RuntimeError("request failed")

MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

MARINE_PARAMS = [
    "wave_height",
    "wave_direction",
    "wave_period",
    "swell_wave_height",
    "swell_wave_direction",
    "swell_wave_period",
    "sea_surface_temperature",
]

WIND_PARAMS = [
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
]


def _degrees_to_compass(deg: float) -> str:
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = round(deg / 22.5) % 16
    return dirs[idx]


def _build_conditions(marine: dict, wind: dict | None) -> dict:
    wave_height = marine.get("wave_height") or 0.0
    wave_dir = marine.get("wave_direction") or 0.0
    wave_period = marine.get("wave_period") or 0.0
    swell_height = marine.get("swell_wave_height")
    swell_period = marine.get("swell_wave_period")
    water_temp = marine.get("sea_surface_temperature")

    wind = wind or {}
    wind_speed = wind.get("wind_speed_10m") or 0.0
    wind_dir = wind.get("wind_direction_10m") or 0.0
    wind_gusts = wind.get("wind_gusts_10m") or 0.0

    compass = _degrees_to_compass(wind_dir)
    wind_label = f"{compass} {wind_speed:.0f} km/h"

    return {
        "wave": {
            "height_m": round(wave_height, 2),
            "period_s": round(wave_period, 1),
            "direction_deg": round(wave_dir, 1),
            "swell_height_m": round(swell_height, 2) if swell_height is not None else None,
            "swell_period_s": round(swell_period, 1) if swell_period is not None else None,
        },
        "wind": {
            "speed_kmh": round(wind_speed, 1),
            "direction_deg": round(wind_dir, 1),
            "gusts_kmh": round(wind_gusts, 1),
            "label": wind_label,
        },
        "water_temp_c": round(water_temp, 1) if water_temp is not None else None,
    }


async def fetch_conditions(lat: float, lon: float) -> dict:
    """
    Fetch current marine + wind conditions from Open-Meteo. Cached for 10 min.
    Resilient: serves stale data on failure; degrades to marine-only if the
    (rate-limited) wind API is unavailable.
    """
    key = f"conditions:{lat:.3f},{lon:.3f}"
    cached = await _cache_get(key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            marine_resp, wind_resp = await _fetch_both(client, lat, lon)
        result = _build_conditions(marine_resp["current"], wind_resp["current"])
        await _cache_set(key, result, ttl_seconds=600)  # 10 minutes
        return result
    except Exception as exc:
        logger.warning("conditions fetch failed (%.3f,%.3f): %r", lat, lon, exc)

    # 1) Serve stale data if we have any (up to 24h old).
    stale = await _cache_get(key, allow_stale=True)
    if stale is not None:
        logger.info("serving STALE conditions for %.3f,%.3f", lat, lon)
        return stale

    # 2) Last resort: marine (waves) usually works even when wind is throttled.
    async with httpx.AsyncClient(timeout=20.0) as client:
        marine_resp = await _get_with_retry(client, MARINE_URL, {
            "latitude": lat, "longitude": lon,
            "current": ",".join(MARINE_PARAMS),
            "length_unit": "metric", "wind_speed_unit": "kmh",
        })
    result = _build_conditions(marine_resp.json()["current"], None)
    # short TTL so we retry wind soon
    await _cache_set(key, result, ttl_seconds=120)
    logger.info("serving MARINE-ONLY conditions for %.3f,%.3f", lat, lon)
    return result


async def fetch_forecast(lat: float, lon: float, ocean_facing_deg: int) -> list[dict]:
    """
    Fetch 7-day hourly surf forecast from Open-Meteo. Cached for 1 hour.
    Returns a list of day objects, each with hourly surf data + daily summary.
    """
    key = f"forecast:{lat:.3f},{lon:.3f}"
    cached = await _cache_get(key)
    if cached is not None:
        return cached

    AEST = timezone(timedelta(hours=10))

    hourly_marine = ["wave_height", "wave_period", "wave_direction"]
    hourly_wind   = ["wind_speed_10m", "wind_direction_10m"]

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Marine (waves) is essential.
            marine_resp = await _get_with_retry(client, MARINE_URL, {
                "latitude": lat, "longitude": lon,
                "hourly": ",".join(hourly_marine),
                "forecast_days": 7,
                "length_unit": "metric",
                "wind_speed_unit": "kmh",
                "timezone": "Australia/Brisbane",
            })
            # Wind is best-effort — degrade to no-wind if it stays rate-limited.
            try:
                wind_resp = await _get_with_retry(client, FORECAST_URL, {
                    "latitude": lat, "longitude": lon,
                    "hourly": ",".join(hourly_wind),
                    "forecast_days": 7,
                    "wind_speed_unit": "kmh",
                    "timezone": "Australia/Brisbane",
                })
                wind_h = wind_resp.json()["hourly"]
            except Exception as exc:
                logger.warning("forecast wind fetch failed (%.3f,%.3f): %r", lat, lon, exc)
                wind_h = None
    except Exception as exc:
        logger.warning("forecast fetch failed (%.3f,%.3f): %r", lat, lon, exc)
        stale = await _cache_get(key, allow_stale=True)
        if stale is not None:
            logger.info("serving STALE forecast for %.3f,%.3f", lat, lon)
            return stale
        raise

    marine_h = marine_resp.json()["hourly"]

    times       = marine_h["time"]
    wave_heights = marine_h["wave_height"]
    wave_periods = marine_h["wave_period"]
    wave_dirs    = marine_h["wave_direction"]
    wind_speeds  = wind_h["wind_speed_10m"]    if wind_h else [0.0] * len(times)
    wind_dirs    = wind_h["wind_direction_10m"] if wind_h else [0.0] * len(times)

    # Group hours into days
    from collections import defaultdict
    days: dict[str, list[dict]] = defaultdict(list)

    for i, t in enumerate(times):
        date_str = t[:10]   # "2026-04-06"
        hour     = int(t[11:13])

        wh  = wave_heights[i] or 0.0
        wp  = wave_periods[i] or 0.0
        wd  = wave_dirs[i]    or 0.0
        ws  = wind_speeds[i]  or 0.0
        wdir = wind_dirs[i]   or 0.0

        from scoring import calculate_score
        score, label = calculate_score(wh, wp, ws, wdir, ocean_facing_deg, [])

        days[date_str].append({
            "hour":          hour,
            "wave_height_m": round(wh, 2),
            "wave_period_s": round(wp, 1),
            "wind_speed_kmh": round(ws, 1),
            "wind_dir_deg":  round(wdir, 1),
            "surf_score":    score,
            "score_label":   label,
        })

    # Build day summaries
    from datetime import date as dt_date
    today = datetime.now(AEST).date()
    result = []

    for date_str, hours in sorted(days.items()):
        day_date = dt_date.fromisoformat(date_str)
        delta    = (day_date - today).days

        if delta == 0:   label_str = "Today"
        elif delta == 1: label_str = "Tomorrow"
        else:            label_str = f"{day_date.strftime('%a')} {day_date.day}"  # "Tue 8"

        daytime = [h for h in hours if 5 <= h["hour"] <= 20]
        if not daytime:
            daytime = hours

        best   = max(daytime, key=lambda h: h["surf_score"])
        max_wh = max(h["wave_height_m"] for h in daytime)

        result.append({
            "date":       date_str,
            "label":      label_str,
            "hours":      hours,
            "max_wave_m": round(max_wh, 2),
            "best_score": best["surf_score"],
            "best_label": best["score_label"],
            "best_hour":  best["hour"],
        })

    # Full data caches 1h; partial (no wind) caches briefly so we retry soon.
    await _cache_set(key, result, ttl_seconds=3600 if wind_h else 180)
    return result


async def _fetch_both(client: httpx.AsyncClient, lat: float, lon: float):
    """Fetch marine + wind, each with throttle + retry. Both must succeed."""
    marine_resp = await _get_with_retry(client, MARINE_URL, {
        "latitude": lat, "longitude": lon,
        "current": ",".join(MARINE_PARAMS),
        "length_unit": "metric", "wind_speed_unit": "kmh",
    })
    wind_resp = await _get_with_retry(client, FORECAST_URL, {
        "latitude": lat, "longitude": lon,
        "current": ",".join(WIND_PARAMS),
        "wind_speed_unit": "kmh",
    })
    return marine_resp.json(), wind_resp.json()
