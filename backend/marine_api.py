"""
Open-Meteo Marine API + Forecast API client.

Marine API docs: https://open-meteo.com/en/docs/marine-weather-api
Forecast API docs: https://open-meteo.com/en/docs

No API key required.
"""

import math
from datetime import datetime, timedelta, timezone

import httpx

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


async def fetch_conditions(lat: float, lon: float) -> dict:
    """Fetch current marine + wind conditions from Open-Meteo."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        marine_resp, wind_resp = await _fetch_both(client, lat, lon)

    marine = marine_resp["current"]
    wind = wind_resp["current"]

    wave_height = marine.get("wave_height") or 0.0
    wave_dir = marine.get("wave_direction") or 0.0
    wave_period = marine.get("wave_period") or 0.0
    swell_height = marine.get("swell_wave_height")
    swell_period = marine.get("swell_wave_period")
    water_temp = marine.get("sea_surface_temperature")

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


async def fetch_forecast(lat: float, lon: float, ocean_facing_deg: int) -> list[dict]:
    """
    Fetch 7-day hourly surf forecast from Open-Meteo.
    Returns a list of day objects, each with hourly surf data + daily summary.
    """
    import asyncio
    from datetime import timezone as tz

    AEST = timezone(timedelta(hours=10))

    hourly_marine = ["wave_height", "wave_period", "wave_direction"]
    hourly_wind   = ["wind_speed_10m", "wind_direction_10m"]

    async with httpx.AsyncClient(timeout=15.0) as client:
        marine_task = client.get(MARINE_URL, params={
            "latitude": lat, "longitude": lon,
            "hourly": ",".join(hourly_marine),
            "forecast_days": 7,
            "length_unit": "metric",
            "wind_speed_unit": "kmh",
            "timezone": "Australia/Brisbane",
        })
        wind_task = client.get(FORECAST_URL, params={
            "latitude": lat, "longitude": lon,
            "hourly": ",".join(hourly_wind),
            "forecast_days": 7,
            "wind_speed_unit": "kmh",
            "timezone": "Australia/Brisbane",
        })
        marine_resp, wind_resp = await asyncio.gather(marine_task, wind_task)
        marine_resp.raise_for_status()
        wind_resp.raise_for_status()

    marine_h = marine_resp.json()["hourly"]
    wind_h   = wind_resp.json()["hourly"]

    times       = marine_h["time"]
    wave_heights = marine_h["wave_height"]
    wave_periods = marine_h["wave_period"]
    wave_dirs    = marine_h["wave_direction"]
    wind_speeds  = wind_h["wind_speed_10m"]
    wind_dirs    = wind_h["wind_direction_10m"]

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

    return result


async def _fetch_both(client: httpx.AsyncClient, lat: float, lon: float):
    import asyncio

    marine_task = client.get(MARINE_URL, params={
        "latitude": lat,
        "longitude": lon,
        "current": ",".join(MARINE_PARAMS),
        "length_unit": "metric",
        "wind_speed_unit": "kmh",
    })
    wind_task = client.get(FORECAST_URL, params={
        "latitude": lat,
        "longitude": lon,
        "current": ",".join(WIND_PARAMS),
        "wind_speed_unit": "kmh",
    })

    marine_resp, wind_resp = await asyncio.gather(marine_task, wind_task)
    marine_resp.raise_for_status()
    wind_resp.raise_for_status()
    return marine_resp.json(), wind_resp.json()
