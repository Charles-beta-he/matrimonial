"""Fraud detection using keyword patterns and behavioral signals."""
from __future__ import annotations

import re

FRAUD_PATTERNS: list[tuple[str, float]] = [
    (r"(\u6295\u8d44|\u7406\u8d22|\u8d5a\u94b1|\u56de\u62a5|\u6536\u76ca).*(\u4fdd\u8bc1|\u7a33\u8d5a|\u7ffb\u500d)", 0.9),
    # (投资|理财|赚钱|回报|收益).*(保证|稳赚|翻倍)
    (r"(\u501f|\u8f6c|\u6253).*(\u94b1|\u6b3e|\u8d26)", 0.8),
    # (借|转|打).*(钱|款|账)
    (r"(\u9a8c\u8bc1\u7801|\u5bc6\u7801|\u94f6\u884c\u5361).*(\u544a\u8bc9|\u53d1|\u7ed9)", 0.95),
    # (验证码|密码|银行卡).*(告诉|发|给)
    (r"(\u6025\u7528|\u6551\u547d|\u751f\u75c5|\u51fa\u4e8b)", 0.6),
    # (急用|救命|生病|出事)
    (r"(\u94fe\u63a5|\u7f51\u5740|\u70b9\u51fb|\u626b\u7801)", 0.5),
    # (链接|网址|点击|扫码)
]


def detect_fraud(text: str) -> float:
    """
    Detect fraud probability in text content.

    Args:
        text: The text to analyze.

    Returns:
        Fraud probability between 0.0 and 1.0.
    """
    max_score: float = 0.0
    for pattern, score in FRAUD_PATTERNS:
        if re.search(pattern, text):
            max_score = max(max_score, score)
    return max_score
