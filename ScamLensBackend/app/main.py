from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.core.config import get_settings
from app.db.session import init_db
from app.services.scam_detection.hf_classifier import _load_classifier
from contextlib import asynccontextmanager

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.2.0", description="Shared ScamLens analysis and history API. Heuristic analysis is a prototype.")

origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def root():
    return {"name": settings.app_name, "status": "ok", "docs": "/docs"}

@app.get("/model")
async def modelLoad():
    print("Loading scam prediction ML model into memory...")
    _load_classifier()
    print("Loading complete...")

app.include_router(router)
