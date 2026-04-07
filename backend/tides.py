"""
Approximate tidal prediction for Sunshine Coast, QLD.

Uses the M2 harmonic constituent (principal lunar semi-diurnal, period ≈12h 25min).
This is an estimation model — NOT official BOM tide data.
Heights are approximate MHWS/MLWS for the Sunshine Coast.
"""
import math
from datetime import datetime, timedelta, timezone

# Queensland: UTC+10, no daylight saving
AEST = timezone(timedelta(hours=10))

# M2 principal lunar semi-diurnal constituent period
M2_PERIOD_HOURS = 12.4206

# Reference high tide calibrated to Mooloolaba, QLD
# Source: approximate BOM tide table pattern for Sunshine Coast
REFERENCE_HIGH = datetime(2024, 1, 2, 11, 48, tzinfo=AEST)

# Sunshine Coast approximate tidal heights
HIGH_M = 1.65   # Mean High Water Springs
LOW_M  = 0.30   # Mean Low Water Springs


def get_tides_today() -> list[dict]:
    """
    Return today's high/low tides (AEST) for the Sunshine Coast.
    Returns up to 4 events sorted by time.
    """
    now     = datetime.now(AEST)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_day  = midnight + timedelta(hours=28)  # slightly past midnight to catch final event

    # How many hours from reference high tide to midnight today
    elapsed = (midnight - REFERENCE_HIGH).total_seconds() / 3600

    # Phase at midnight: 0 = high tide, π = low tide
    phase = (elapsed % M2_PERIOD_HOURS) / M2_PERIOD_HOURS * (2 * math.pi)

    # Hours from midnight until the next high tide
    hrs_to_first_high = ((2 * math.pi - phase) % (2 * math.pi)) / (2 * math.pi) * M2_PERIOD_HOURS

    tides: list[dict] = []
    t        = midnight + timedelta(hours=hrs_to_first_high)
    is_high  = True

    while t < end_day and len(tides) < 5:
        if t >= midnight:
            tides.append({
                "type":     "high" if is_high else "low",
                "time":     t.strftime("%H:%M"),       # display time AEST
                "time_iso": t.isoformat(),
                "height_m": HIGH_M if is_high else LOW_M,
            })
        t       += timedelta(hours=M2_PERIOD_HOURS / 2)
        is_high  = not is_high

    return sorted(tides[:4], key=lambda x: x["time_iso"])
