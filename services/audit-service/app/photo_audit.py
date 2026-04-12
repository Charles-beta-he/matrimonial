"""Photo audit with rule-based checks + external API placeholder."""
from __future__ import annotations

import re

BLOCKED_DOMAINS: list[str] = ["spam.com", "fake.com"]


def audit_photo(url: str, user_id: str) -> dict:
    """
    Audit a photo URL for policy compliance.

    Args:
        url: The image URL to audit.
        user_id: The uploading user's ID.

    Returns:
        Dict with url, userId, status (APPROVED/REJECTED/REVIEW), and reasons.
    """
    result: dict = {"url": url, "userId": user_id, "status": "APPROVED", "reasons": []}

    # Check URL validity
    if not url.startswith(("http://", "https://")):
        result["status"] = "REJECTED"
        result["reasons"].append("invalid_url")
        return result

    # Check blocked domains
    for domain in BLOCKED_DOMAINS:
        if domain in url:
            result["status"] = "REJECTED"
            result["reasons"].append("blocked_domain")
            return result

    # Check for suspicious file extensions
    suspicious_extensions = [".exe", ".bat", ".sh", ".php", ".js"]
    url_lower = url.lower().split("?")[0]  # strip query params
    for ext in suspicious_extensions:
        if url_lower.endswith(ext):
            result["status"] = "REJECTED"
            result["reasons"].append("suspicious_file_type")
            return result

    # Check for very long URLs (possible injection)
    if len(url) > 2048:
        result["status"] = "REVIEW"
        result["reasons"].append("url_too_long")
        return result

    # In production: call cloud image moderation API (Aliyun/Tencent)
    # For now: approve all valid URLs
    return result
