from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.recommend import router as recommend_router

app = FastAPI(title="matrimonial-recommend-service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(recommend_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
