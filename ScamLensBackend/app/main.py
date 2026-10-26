from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.core.config import get_settings
from app.db.session import init_db
from contextlib import asynccontextmanager

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.2.0", description="Shared ScamLens analysis and history API. Heuristic analysis is a prototype.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"]
)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def root():
    return {"name": settings.app_name, "status": "ok", "docs": "/docs"}


app.include_router(router)
