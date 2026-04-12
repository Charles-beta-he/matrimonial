"""Interaction feature extraction from user behavior data."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class InteractionLog:
    """A single interaction event."""
    user_id: str
    target_id: str
    action: str  # "like", "dislike", "view", "message", "block", "report"
    timestamp: float = 0.0


@dataclass
class InteractionStats:
    """Aggregated interaction statistics for a user."""
    likes_given: int = 0
    likes_received: int = 0
    dislikes_given: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    views_given: int = 0
    views_received: int = 0
    blocks_given: int = 0
    reports_given: int = 0
    response_rate: float = 0.0  # messages_replied / messages_received
    avg_response_time_hours: float = 0.0
    active_days_last_30: int = 0


def aggregate_interactions(
    user_id: str,
    logs: list[InteractionLog],
) -> InteractionStats:
    """
    Aggregate raw interaction logs into summary statistics.

    Args:
        user_id: The user to compute stats for.
        logs: All interaction logs involving this user.

    Returns:
        InteractionStats with computed metrics.
    """
    stats = InteractionStats()
    messages_received_from: set[str] = set()
    messages_replied_to: set[str] = set()
    active_days: set[int] = set()

    for log in logs:
        day = int(log.timestamp // 86400)

        if log.user_id == user_id:
            # Outgoing actions
            active_days.add(day)
            if log.action == "like":
                stats.likes_given += 1
            elif log.action == "dislike":
                stats.dislikes_given += 1
            elif log.action == "view":
                stats.views_given += 1
            elif log.action == "message":
                stats.messages_sent += 1
                if log.target_id in messages_received_from:
                    messages_replied_to.add(log.target_id)
            elif log.action == "block":
                stats.blocks_given += 1
            elif log.action == "report":
                stats.reports_given += 1

        elif log.target_id == user_id:
            # Incoming actions
            if log.action == "like":
                stats.likes_received += 1
            elif log.action == "view":
                stats.views_received += 1
            elif log.action == "message":
                stats.messages_received += 1
                messages_received_from.add(log.user_id)

    stats.active_days_last_30 = min(len(active_days), 30)
    stats.response_rate = (
        len(messages_replied_to) / len(messages_received_from)
        if messages_received_from
        else 0.0
    )

    return stats


def extract_interaction_features(
    user_id: str,
    logs: list[InteractionLog] | None = None,
) -> dict:
    """
    Extract normalized interaction features for a user.

    Args:
        user_id: Target user ID.
        logs: Interaction logs. If None, returns default features.

    Returns:
        Dict of normalized interaction features.
    """
    if logs is None:
        # Return defaults when no data available
        return {
            "like_ratio": 0.5,
            "response_rate": 0.5,
            "activity_level": 0.0,
            "selectivity": 0.5,
            "popularity": 0.0,
            "engagement_score": 0.0,
        }

    stats = aggregate_interactions(user_id, logs)

    # Like ratio: likes_given / (likes_given + dislikes_given)
    total_swipes = stats.likes_given + stats.dislikes_given
    like_ratio = stats.likes_given / total_swipes if total_swipes > 0 else 0.5

    # Activity level: active_days / 30
    activity_level = stats.active_days_last_30 / 30.0

    # Selectivity: inverse of like_ratio (higher = more selective)
    selectivity = 1.0 - like_ratio

    # Popularity: likes_received normalized (log scale)
    import math
    popularity = min(math.log1p(stats.likes_received) / math.log1p(100), 1.0)

    # Engagement: weighted sum of messaging activity
    total_msgs = stats.messages_sent + stats.messages_received
    engagement = min(math.log1p(total_msgs) / math.log1p(200), 1.0)

    return {
        "like_ratio": round(like_ratio, 4),
        "response_rate": round(stats.response_rate, 4),
        "activity_level": round(activity_level, 4),
        "selectivity": round(selectivity, 4),
        "popularity": round(popularity, 4),
        "engagement_score": round(engagement, 4),
    }
