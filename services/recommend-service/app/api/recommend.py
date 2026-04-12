from __future__ import annotations

import math
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.models.collaborative import collaborative_filter
from app.models.embedding import embed_user_profile, cosine_similarity
from app.models.ranker import mmr_rerank
from app.features.user_features import extract_user_features
from app.features.interaction import extract_interaction_features

router = APIRouter(tags=["recommend"])

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    id: str
    age: int = 25
    gender: str = "male"
    city: str = ""
    education: str = ""
    height: int = 170
    tags: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    mbti: str = ""
    active_hours: list[int] = Field(default_factory=list)  # e.g. [9, 10, 20, 21]
    online_frequency: float = 0.5  # 0-1 normalized
    verification_level: int = 0  # 0-3
    like_count: int = 0

class RecommendRequest(BaseModel):
    user: UserProfile
    candidates: list[UserProfile] = Field(default_factory=list)
    limit: int = 20

class MatchScoreDetail(BaseModel):
    candidate_id: str
    total_score: float
    basic_match: float
    interest_overlap: float
    personality_complement: float
    behavior_similarity: float
    appearance_pref: float
    social_validation: float

class RecommendResponse(BaseModel):
    user_id: str
    items: list[MatchScoreDetail]

# ---------------------------------------------------------------------------
# MBTI compatibility (simplified)
# ---------------------------------------------------------------------------

_MBTI_COMPAT: dict[str, list[str]] = {
    "INTJ": ["ENFP", "ENTP"],
    "INTP": ["ENTJ", "ENFJ"],
    "ENTJ": ["INTP", "INFP"],
    "ENTP": ["INTJ", "INFJ"],
    "INFJ": ["ENTP", "ENFP"],
    "INFP": ["ENTJ", "ENFJ"],
    "ENFJ": ["INFP", "INTP"],
    "ENFP": ["INTJ", "INFJ"],
    "ISTJ": ["ESFP", "ESTP"],
    "ISFJ": ["ESFP", "ESTP"],
    "ESTJ": ["ISFP", "ISTP"],
    "ESFJ": ["ISFP", "ISTP"],
    "ISTP": ["ESFJ", "ESTJ"],
    "ISFP": ["ESTJ", "ESFJ"],
    "ESTP": ["ISTJ", "ISFJ"],
    "ESFP": ["ISTJ", "ISFJ"],
}

# ---------------------------------------------------------------------------
# 6-dimension scoring functions
# ---------------------------------------------------------------------------

EDUCATION_RANK: dict[str, int] = {
    "high_school": 1,
    "associate": 2,
    "bachelor": 3,
    "master": 4,
    "phd": 5,
}


def basic_match(a: UserProfile, b: UserProfile) -> float:
    """Compare age range, city, education, height -> 0-1."""
    score = 0.0
    total_weight = 0.0

    # Age: within 5 years -> 1.0, within 10 -> 0.5, else 0.0
    age_diff = abs(a.age - b.age)
    if age_diff <= 5:
        score += 1.0
    elif age_diff <= 10:
        score += 0.5
    total_weight += 1.0

    # City match
    if a.city and b.city:
        score += 1.0 if a.city == b.city else 0.0
    total_weight += 1.0

    # Education match
    edu_a = EDUCATION_RANK.get(a.education, 0)
    edu_b = EDUCATION_RANK.get(b.education, 0)
    if edu_a and edu_b:
        edu_diff = abs(edu_a - edu_b)
        score += max(0.0, 1.0 - edu_diff * 0.25)
    total_weight += 1.0

    # Height: within 15cm -> 1.0, within 25cm -> 0.5, else 0.0
    height_diff = abs(a.height - b.height)
    if height_diff <= 15:
        score += 1.0
    elif height_diff <= 25:
        score += 0.5
    total_weight += 1.0

    return score / total_weight if total_weight > 0 else 0.0


def interest_overlap(a: UserProfile, b: UserProfile) -> float:
    """Jaccard similarity on tag + interest sets -> 0-1."""
    set_a = set(a.tags + a.interests)
    set_b = set(b.tags + b.interests)
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def personality_complement(a: UserProfile, b: UserProfile) -> float:
    """MBTI compatibility -> 0-1."""
    if not a.mbti or not b.mbti:
        return 0.5  # neutral when unknown
    ideal = _MBTI_COMPAT.get(a.mbti.upper(), [])
    if b.mbti.upper() in ideal:
        return 1.0
    # Same type -> moderate compatibility
    if a.mbti.upper() == b.mbti.upper():
        return 0.6
    # Count matching dimensions (I/E, N/S, T/F, J/P)
    matches = sum(1 for x, y in zip(a.mbti.upper(), b.mbti.upper()) if x == y)
    return 0.3 + matches * 0.1


def behavior_similarity(a: UserProfile, b: UserProfile) -> float:
    """Compare active hours and online frequency -> 0-1."""
    score = 0.0

    # Active hours overlap
    if a.active_hours and b.active_hours:
        set_a = set(a.active_hours)
        set_b = set(b.active_hours)
        overlap = len(set_a & set_b) / max(len(set_a | set_b), 1)
        score += overlap * 0.5

    # Online frequency similarity
    freq_diff = abs(a.online_frequency - b.online_frequency)
    score += (1.0 - freq_diff) * 0.5

    return score


def appearance_pref(a: UserProfile, b: UserProfile) -> float:
    """Based on user's like history patterns -> 0-1 (stub with 0.5)."""
    # In production: analyze past like patterns to build appearance preference model
    return 0.5


def social_validation(b: UserProfile) -> float:
    """Verification level + like count normalized -> 0-1."""
    # Verification: 0-3 mapped to 0-0.5
    verification_score = min(b.verification_level / 3.0, 1.0) * 0.5

    # Like count: log-normalized, cap at 1000
    like_score = min(math.log1p(b.like_count) / math.log1p(1000), 1.0) * 0.5

    return verification_score + like_score


def calculate_match_score(user_a: UserProfile, user_b: UserProfile) -> MatchScoreDetail:
    """6-dimension weighted match score calculation."""
    bm = basic_match(user_a, user_b)
    io = interest_overlap(user_a, user_b)
    pc = personality_complement(user_a, user_b)
    bs = behavior_similarity(user_a, user_b)
    ap = appearance_pref(user_a, user_b)
    sv = social_validation(user_b)

    total = (
        bm * 0.25
        + io * 0.20
        + pc * 0.20
        + bs * 0.15
        + ap * 0.10
        + sv * 0.10
    )

    return MatchScoreDetail(
        candidate_id=user_b.id,
        total_score=round(total, 4),
        basic_match=round(bm, 4),
        interest_overlap=round(io, 4),
        personality_complement=round(pc, 4),
        behavior_similarity=round(bs, 4),
        appearance_pref=round(ap, 4),
        social_validation=round(sv, 4),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest) -> RecommendResponse:
    """Score all candidates and return top-N with diversity re-ranking."""
    scored: list[MatchScoreDetail] = []
    for candidate in req.candidates:
        if candidate.id == req.user.id:
            continue
        detail = calculate_match_score(req.user, candidate)
        scored.append(detail)

    # Sort by score descending
    scored.sort(key=lambda x: x.total_score, reverse=True)

    # Apply MMR diversity re-ranking if we have embeddings
    if scored:
        user_vec = embed_user_profile(extract_user_features(req.user.model_dump()))
        candidate_vecs = {
            s.candidate_id: embed_user_profile(
                extract_user_features(
                    next((c.model_dump() for c in req.candidates if c.id == s.candidate_id), {})
                )
            )
            for s in scored
        }
        reranked_ids = mmr_rerank(
            scores={s.candidate_id: s.total_score for s in scored},
            embeddings=candidate_vecs,
            query_embedding=user_vec,
            top_k=req.limit,
            diversity_weight=0.3,
        )
        id_order = {cid: idx for idx, cid in enumerate(reranked_ids)}
        scored.sort(key=lambda x: id_order.get(x.candidate_id, 999))

    return RecommendResponse(
        user_id=req.user.id,
        items=scored[: req.limit],
    )


@router.get("/recommend")
def recommend_get(user_id: str, limit: int = 20) -> dict:
    """Simple GET endpoint for basic recommendations.

    Returns mock scored candidates. The real implementation should fetch
    candidates from the main server DB via an internal read API and run
    them through `calculate_match_score`.
    """
    import random

    # Generate mock scored items — deterministic per user_id for dev
    random.seed(user_id)
    items: list[dict] = []
    # Return empty by default — the main server will fall back to its own
    # DB-based filtering logic. Toggle MOCK_RECOMMEND=1 to emit mock items.
    import os
    if os.environ.get("MOCK_RECOMMEND") == "1":
        for i in range(min(limit, 10)):
            items.append({
                "userId": f"mock-user-{i}",
                "score": round(random.uniform(0.5, 0.95), 4),
                "reason": "interest_overlap",
            })
    return {"user_id": user_id, "items": items}


class ScorePairRequest(BaseModel):
    user_a: UserProfile
    user_b: UserProfile


@router.post("/score")
def score_pair(req: ScorePairRequest) -> dict:
    """Score a pair of users and return total + breakdown."""
    detail = calculate_match_score(req.user_a, req.user_b)
    return {
        "score": detail.total_score,
        "detail": detail.model_dump(),
    }
