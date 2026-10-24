from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.core.config import get_settings
from app.db.session import init_db
from app.services.scam_detection.hf_classifier import _load_classifier
from contextlib import asynccontextmanager

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    print("Initializing components...")
    print("Loading scam prediction ML model into memory...")
    
    _load_classifier()
    
    yield  
    
    print("Cleaning up resources...")


app = FastAPI(title=settings.app_name, version="0.2.0", description="Shared ScamLens analysis and history API. Heuristic analysis is a prototype.", lifespan=lifespan)

origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def root():
    return {"name": settings.app_name, "status": "ok", "docs": "/docs"}

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)