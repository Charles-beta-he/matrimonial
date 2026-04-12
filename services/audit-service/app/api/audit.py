from fastapi import APIRouter
from pydantic import BaseModel
from app.photo_audit import audit_photo
from app.text_audit import audit_text
from app.fraud_detect import detect_fraud

router = APIRouter(tags=["audit"])


class PhotoAuditRequest(BaseModel):
    url: str
    userId: str


class TextAuditRequest(BaseModel):
    text: str
    userId: str
    context: str = "message"  # message / bio / prompt_answer


@router.post("/photo")
def audit_photo_endpoint(req: PhotoAuditRequest):
    return audit_photo(req.url, req.userId)


@router.post("/text")
def audit_text_endpoint(req: TextAuditRequest):
    return audit_text(req.text, req.context)


@router.post("/fraud")
def detect_fraud_endpoint(req: TextAuditRequest):
    score = detect_fraud(req.text)
    return {"score": score, "is_fraud": score > 0.7}
