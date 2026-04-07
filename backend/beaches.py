"""
Hardcoded beach data for Sunshine Coast, Queensland, Australia.
ocean_facing: direction the beach faces toward the ocean (degrees).
Used to determine if wind is offshore (good) or onshore (bad).
"""

BEACHES: dict[str, dict] = {
    "noosa": {
        "id": "noosa",
        "name": "Noosa",
        "lat": -26.3916,
        "lon": 153.0940,
        "description": "Famous point break, ideal for longboarding and intermediate surfers.",
        "ocean_facing": 80,
        "webcam_url": "https://www.youtube.com/watch?v=FkPMbcSXQGQ",
    },
    "mooloolaba": {
        "id": "mooloolaba",
        "name": "Mooloolaba",
        "lat": -26.6800,
        "lon": 153.1200,
        "description": "Sheltered beach break, great for beginners and families.",
        "ocean_facing": 90,
        "webcam_url": "https://www.swellnet.com/webcams/mooloolaba",
    },
    "alexandra-headland": {
        "id": "alexandra-headland",
        "name": "Alexandra Headland",
        "lat": -26.6852,
        "lon": 153.1206,
        "description": "Consistent beach break, popular with locals year-round.",
        "ocean_facing": 100,
        "webcam_url": "https://www.swellnet.com/webcams/alexandra-headland",
    },
    "coolum": {
        "id": "coolum",
        "name": "Coolum",
        "lat": -26.5329,
        "lon": 153.0961,
        "description": "Open beach break that picks up swell well. Good on SE winds.",
        "ocean_facing": 90,
        "webcam_url": None,
    },
    "caloundra": {
        "id": "caloundra",
        "name": "Caloundra",
        "lat": -26.8006,
        "lon": 153.1304,
        "description": "Multiple breaks suitable for all skill levels.",
        "ocean_facing": 110,
        "webcam_url": None,
    },
}
