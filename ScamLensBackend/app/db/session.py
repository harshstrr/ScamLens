from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.db.base import Base

settings = get_settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    if get_settings().app_env == "development" and get_settings().database_url.startswith("sqlite"):
        from app.models import Account, ScanRecord
        Base.metadata.create_all(bind=engine)
