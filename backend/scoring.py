"""
Surf score calculator (0–10).

Combines:
  - Wave height (main driver)
  - Wave period (longer = cleaner energy)
  - Wind (offshore = bonus, onshore = penalty)
  - User report tags (community boost/penalty)
"""

import math


POSITIVE_TAGS = {"clean", "glassy", "pumping", "barreling"}
NEGATIVE_TAGS = {"choppy", "closing out", "crowded"}


def _wind_angle_delta(wind_dir: float, ocean_facing: float) -> float:
    """
    Returns angle difference (0–180) between wind direction and the direction
    the beach faces toward the ocean.
    0   = wind blowing straight offshore (best)
    180 = wind blowing straight onshore (worst)
    """
    delta = abs((wind_dir - ocean_facing + 180) % 360 - 180)
    return delta


def _wave_height_score(height_m: float) -> float:
    """Maps wave height to a 0–8 base score."""
    if height_m < 0.2:
        return 1.0   # flat
    if height_m < 0.5:
        return 3.5   # ankle–knee
    if height_m < 0.9:
        return 5.5   # knee–waist
    if height_m < 1.4:
        return 7.5   # waist–chest
    if height_m < 2.0:
        return 8.0   # head high
    if height_m < 2.5:
        return 7.0   # overhead
    if height_m < 3.5:
        return 5.5   # double overhead
    return 4.0       # maxed out / dangerous


def _period_bonus(period_s: float) -> float:
    if period_s >= 14:
        return 1.5
    if period_s >= 10:
        return 1.0
    if period_s >= 8:
        return 0.5
    return 0.0


def _wind_modifier(speed_kmh: float, wind_dir: float, ocean_facing: float) -> float:
    delta = _wind_angle_delta(wind_dir, ocean_facing)
    offshore = delta < 90  # wind blowing away from the beach

    if speed_kmh < 5:
        return 0.5   # glassy, always good

    if offshore:
        if speed_kmh < 20:
            return 0.5   # light offshore: grooming the waves
        return 0.0       # strong offshore: messy but acceptable
    else:
        # onshore
        if speed_kmh < 15:
            return -0.5
        if speed_kmh < 25:
            return -1.5
        return -2.5      # strong onshore: blown out


def _tag_modifier(tags: list[str]) -> float:
    score = 0.0
    for tag in tags:
        if tag in POSITIVE_TAGS:
            score += 0.3
        elif tag in NEGATIVE_TAGS:
            score -= 0.3
    return max(-1.0, min(1.0, score))


def _score_label(score: float) -> str:
    if score < 2:
        return "Flat"
    if score < 4:
        return "Poor"
    if score < 6:
        return "Fair"
    if score < 8:
        return "Good"
    return "Epic"


def calculate_score(
    wave_height_m: float,
    wave_period_s: float,
    wind_speed_kmh: float,
    wind_dir_deg: float,
    ocean_facing_deg: float,
    recent_tags: list[str] | None = None,
) -> tuple[float, str]:
    """Returns (score 0–10, label)."""
    score = _wave_height_score(wave_height_m)
    score += _period_bonus(wave_period_s)
    score += _wind_modifier(wind_speed_kmh, wind_dir_deg, ocean_facing_deg)
    if recent_tags:
        score += _tag_modifier(recent_tags)

    score = round(max(0.0, min(10.0, score)), 1)
    return score, _score_label(score)
