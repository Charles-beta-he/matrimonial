"""Text audit with keyword filtering and pattern detection."""
from __future__ import annotations

import re

# Sensitive word list (sample -- in production load from file/DB)
SENSITIVE_WORDS: list[str] = [
    "\u5fae\u4fe1\u53f7",  # 微信号
    "wx",
    "WeChat",
    "QQ\u53f7",  # QQ号
    "\u52a0\u6211",  # 加我
    "\u79c1\u804a",  # 私聊
    "\u8f6c\u8d26",  # 转账
    "\u6c47\u6b3e",  # 汇款
    "\u501f\u94b1",  # 借钱
    "\u6295\u8d44\u7406\u8d22",  # 投资理财
    "\u8272\u60c5",  # 色情
    "\u88f8\u804a",  # 裸聊
    "\u7ea6\u70ae",  # 约炮
]

CONTACT_PATTERNS: list[str] = [
    r"\d{5,}",  # Long number sequences (phone/QQ)
    r"[a-zA-Z]{2,}\d{3,}",  # WeChat-like IDs
    r"v\s*x\s*[:\uff1a]",  # vx: pattern
]


def audit_text(text: str, context: str = "message") -> dict:
    """
    Audit text content for policy violations.

    Args:
        text: The text to audit.
        context: Where the text appears -- "message", "bio", or "prompt_answer".

    Returns:
        Dict with text, context, status (APPROVED/REJECTED/REVIEW), and flags.
    """
    result: dict = {"text": text, "context": context, "status": "APPROVED", "flags": []}

    text_lower = text.lower()

    # Check sensitive words
    for word in SENSITIVE_WORDS:
        if word.lower() in text_lower:
            result["flags"].append({"type": "sensitive_word", "word": word})

    # Check contact info patterns
    for pattern in CONTACT_PATTERNS:
        if re.search(pattern, text):
            result["flags"].append({"type": "contact_info", "pattern": pattern})

    # Determine status based on flags
    if any(f["type"] == "contact_info" for f in result["flags"]):
        result["status"] = "REJECTED"
    elif len(result["flags"]) > 0:
        result["status"] = "REVIEW"  # Needs human review

    # Stricter rules for bio context
    if context == "bio" and result["status"] == "REVIEW":
        # Bios with any sensitive content should be rejected
        result["status"] = "REJECTED"

    return result
