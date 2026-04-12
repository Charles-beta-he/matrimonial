"""User-based collaborative filtering using cosine similarity on interaction vectors."""
from __future__ import annotations

import math


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def collaborative_filter(
    target_user_id: str,
    interaction_matrix: dict[str, dict[str, float]],
    top_k_similar: int = 10,
    top_n_recommendations: int = 20,
) -> list[tuple[str, float]]:
    """
    User-based collaborative filtering.

    Args:
        target_user_id: The user to generate recommendations for.
        interaction_matrix: {user_id: {item_id: interaction_score}}.
            interaction_score can be 1.0 (like), -1.0 (dislike), 0.5 (view), etc.
        top_k_similar: Number of most similar users to consider.
        top_n_recommendations: Number of recommendations to return.

    Returns:
        List of (candidate_user_id, predicted_score) sorted descending.
    """
    if target_user_id not in interaction_matrix:
        return []

    all_items: set[str] = set()
    for interactions in interaction_matrix.values():
        all_items.update(interactions.keys())
    item_list = sorted(all_items)

    def to_vector(interactions: dict[str, float]) -> list[float]:
        return [interactions.get(item, 0.0) for item in item_list]

    target_vec = to_vector(interaction_matrix[target_user_id])
    target_items = set(interaction_matrix[target_user_id].keys())

    # Compute similarity with all other users
    similarities: list[tuple[str, float]] = []
    for user_id, interactions in interaction_matrix.items():
        if user_id == target_user_id:
            continue
        user_vec = to_vector(interactions)
        sim = _cosine_similarity(target_vec, user_vec)
        if sim > 0:
            similarities.append((user_id, sim))

    # Sort by similarity descending, take top-k
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_users = similarities[:top_k_similar]

    if not top_users:
        return []

    # Aggregate scores for unseen items
    candidate_scores: dict[str, float] = {}
    sim_sum: dict[str, float] = {}

    for similar_user_id, sim in top_users:
        for item_id, score in interaction_matrix[similar_user_id].items():
            if item_id in target_items:
                continue  # Skip items target already interacted with
            if item_id not in candidate_scores:
                candidate_scores[item_id] = 0.0
                sim_sum[item_id] = 0.0
            candidate_scores[item_id] += sim * score
            sim_sum[item_id] += sim

    # Normalize
    recommendations: list[tuple[str, float]] = []
    for item_id, weighted_score in candidate_scores.items():
        total_sim = sim_sum[item_id]
        normalized = weighted_score / total_sim if total_sim > 0 else 0.0
        recommendations.append((item_id, normalized))

    recommendations.sort(key=lambda x: x[1], reverse=True)
    return recommendations[:top_n_recommendations]


def collaborative_score(user_a: dict, user_b: dict) -> float:
    """Compatibility wrapper: compute simple collaborative score between two users."""
    # In production: look up pre-computed collaborative filtering results
    # For now: return neutral score
    return 0.5
