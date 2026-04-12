"""User feature extraction and normalization."""
from __future__ import annotations

import math

# Normalization constants
AGE_MIN = 18
AGE_MAX = 60
HEIGHT_MIN = 140
HEIGHT_MAX = 210
LIKE_COUNT_CAP = 1000
VERIFICATION_MAX = 3

EDUCATION_RANK: dict[str, int] = {
    "high_school": 1,
    "associate": 2,
    "bachelor": 3,
    "master": 4,
    "phd": 5,
}


def _normalize(value: float, min_val: float, max_val: float) -> float:
    """Normalize a value to 0-1 range."""
    if max_val <= min_val:
        return 0.0
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def extract_user_features(user: dict) -> dict:
    """
    Extract and normalize user features into a flat feature dict.

    Input user dict keys (all optional):
        id, age, gender, city, education, height, tags, interests,
        mbti, active_hours, online_frequency, verification_level, like_count

    Returns:
        Dict with normalized numeric features suitable for embedding/scoring.
    """
    features: dict = {}

    # Identity
    features["id"] = user.get("id", "")
    features["gender"] = user.get("gender", "")
    features["city"] = user.get("city", "")
    features["education"] = user.get("education", "")
    features["mbti"] = user.get("mbti", "")

    # Normalized numerics
    age = user.get("age", 25)
    features["age_normalized"] = _normalize(float(age), AGE_MIN, AGE_MAX)

    height = user.get("height", 170)
    features["height_normalized"] = _normalize(float(height), HEIGHT_MIN, HEIGHT_MAX)

    features["online_frequency"] = max(0.0, min(1.0, user.get("online_frequency", 0.5)))

    verification = user.get("verification_level", 0)
    features["verification_level_normalized"] = _normalize(
        float(verification), 0, VERIFICATION_MAX
    )

    like_count = user.get("like_count", 0)
    features["like_count_normalized"] = min(
        math.log1p(like_count) / math.log1p(LIKE_COUNT_CAP), 1.0
    )

    # Categorical / list features (passed through for embedding)
    features["tags"] = user.get("tags", [])
    features["interests"] = user.get("interests", [])
    features["active_hours"] = user.get("active_hours", [])

    # Education rank (numeric)
    features["education_rank"] = EDUCATION_RANK.get(user.get("education", ""), 0)

    return features
