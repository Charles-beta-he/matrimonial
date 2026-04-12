"""MMR (Maximal Marginal Relevance) re-ranking for diversity."""
from __future__ import annotations

import math


def _cosine_sim(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def mmr_rerank(
    scores: dict[str, float],
    embeddings: dict[str, list[float]],
    query_embedding: list[float],
    top_k: int = 20,
    diversity_weight: float = 0.3,
) -> list[str]:
    """
    MMR-style re-ranking to balance relevance and diversity.

    MMR = (1 - lambda) * relevance(d, q) - lambda * max_sim(d, selected)

    Args:
        scores: {candidate_id: relevance_score} from match scoring.
        embeddings: {candidate_id: embedding_vector} for diversity.
        query_embedding: The target user's embedding vector.
        top_k: Number of items to select.
        diversity_weight: Lambda parameter (0 = pure relevance, 1 = pure diversity).

    Returns:
        Ordered list of candidate_ids with diversity-aware ranking.
    """
    if not scores:
        return []

    candidates = list(scores.keys())
    selected: list[str] = []
    remaining = set(candidates)

    # Normalize relevance scores to 0-1
    max_score = max(scores.values()) if scores else 1.0
    min_score = min(scores.values()) if scores else 0.0
    score_range = max_score - min_score if max_score > min_score else 1.0

    for _ in range(min(top_k, len(candidates))):
        best_id: str | None = None
        best_mmr = -float("inf")

        for cid in remaining:
            # Relevance component (normalized)
            relevance = (scores[cid] - min_score) / score_range

            # Diversity component: max similarity to any already-selected item
            max_sim = 0.0
            if selected and cid in embeddings:
                for sid in selected:
                    if sid in embeddings:
                        sim = _cosine_sim(embeddings[cid], embeddings[sid])
                        max_sim = max(max_sim, sim)

            # MMR score
            mmr = (1.0 - diversity_weight) * relevance - diversity_weight * max_sim

            if mmr > best_mmr:
                best_mmr = mmr
                best_id = cid

        if best_id is None:
            break

        selected.append(best_id)
        remaining.discard(best_id)

    return selected


def rank(candidates: list[dict]) -> list[dict]:
    """Simple score-based ranking (backward-compatible wrapper)."""
    return sorted(candidates, key=lambda c: c.get("score", 0.0), reverse=True)
