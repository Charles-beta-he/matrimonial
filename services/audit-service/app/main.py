from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.audit import router as audit_router

app = FastAPI(title="matrimonial-audit-service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(audit_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
