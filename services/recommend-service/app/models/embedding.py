"""User profile vectorization - encode tags, interests, preferences into numeric vectors."""
from __future__ import annotations

import math
import hashlib

# Fixed vocabulary for encoding (in production: learned from data)
_TAG_VOCAB: list[str] = [
    "travel", "music", "reading", "cooking", "sports", "photography",
    "gaming", "movies", "fitness", "art", "dance", "hiking",
    "yoga", "tech", "fashion", "food", "pets", "gardening",
    "writing", "volunteering", "cycling", "swimming", "running", "meditation",
    "singing", "painting", "crafts", "camping", "fishing", "skiing",
    "surfing", "climbing",
]

_EDUCATION_MAP: dict[str, float] = {
    "high_school": 0.2,
    "associate": 0.4,
    "bachelor": 0.6,
    "master": 0.8,
    "phd": 1.0,
}

_GENDER_MAP: dict[str, float] = {
    "male": 0.0,
    "female": 1.0,
    "other": 0.5,
}

EMBEDDING_DIM = 64


def _hash_token(token: str, dim: int) -> int:
    """Deterministic hash of a string to a dimension index."""
    h = hashlib.md5(token.encode()).hexdigest()
    return int(h, 16) % dim


def embed_user_profile(features: dict) -> list[float]:
    """
    Create a numeric vector from user features.

    Features dict expected keys (all optional):
        age_normalized, gender, city, education, height_normalized,
        tags, interests, mbti, active_hours_normalized, online_frequency,
        verification_level_normalized, like_count_normalized

    Returns:
        A list of floats of length EMBEDDING_DIM.
    """
    vec = [0.0] * EMBEDDING_DIM

    # Numeric features occupy first slots
    vec[0] = features.get("age_normalized", 0.5)
    vec[1] = _GENDER_MAP.get(features.get("gender", ""), 0.5)
    vec[2] = _EDUCATION_MAP.get(features.get("education", ""), 0.5)
    vec[3] = features.get("height_normalized", 0.5)
    vec[4] = features.get("online_frequency", 0.5)
    vec[5] = features.get("verification_level_normalized", 0.0)
    vec[6] = features.get("like_count_normalized", 0.0)

    # Active hours as a 24-hour histogram (bins at indices 7-30)
    for hour in features.get("active_hours", []):
        if 0 <= hour < 24:
            vec[7 + hour] = 1.0

    # Tags and interests: hashed into remaining dimensions (31-63)
    tag_dim_start = 31
    tag_dim_size = EMBEDDING_DIM - tag_dim_start
    all_tokens: list[str] = []
    all_tokens.extend(features.get("tags", []))
    all_tokens.extend(features.get("interests", []))

    # Also encode known vocab items
    for token in all_tokens:
        token_lower = token.lower()
        # Check vocab for exact match
        if token_lower in _TAG_VOCAB:
            idx = _TAG_VOCAB.index(token_lower)
            vec[tag_dim_start + (idx % tag_dim_size)] += 1.0
        else:
            # Hash unknown tokens
            idx = _hash_token(token_lower, tag_dim_size)
            vec[tag_dim_start + idx] += 1.0

    # MBTI encoding (last 4 bits pattern)
    mbti = features.get("mbti", "")
    if mbti and len(mbti) == 4:
        mbti_upper = mbti.upper()
        vec[tag_dim_start - 4] = 1.0 if mbti_upper[0] == "E" else 0.0
        vec[tag_dim_start - 3] = 1.0 if mbti_upper[1] == "N" else 0.0
        vec[tag_dim_start - 2] = 1.0 if mbti_upper[2] == "F" else 0.0
        vec[tag_dim_start - 1] = 1.0 if mbti_upper[3] == "P" else 0.0

    # City encoding via hash
    city = features.get("city", "")
    if city:
        city_idx = _hash_token(city, tag_dim_size)
        vec[tag_dim_start + city_idx] += 0.5

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]

    return vec


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two embedding vectors."""
    if len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
