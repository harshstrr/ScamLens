import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.api.routes import scans as scans_route
from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.base import Base
from app.main import app
from app.models import Account, ScanRecord


def test_authenticated_scan_saves_model_analysis_as_json(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = session_factory()
    user = Account(
        google_sub="scan-test-account",
        email="scan-test@example.com",
        refresh_token_hash=None,
    )
    db.add(user)
    db.commit()
    user_id = user.id
    db.close()

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    monkeypatch.setattr(
        scans_route,
        "analyze",
        lambda text, source_url: {
            "risk_level": "low",
            "risk_score": 8,
            "confidence": "low",
            "summary": "Test scan",
            "findings": [],
            "recommendations": [],
            "analysis_version": "test",
            "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "model_analysis": {"prediction": "legitimate", "fraud_score": 0.1},
        },
    )
    app.dependency_overrides[deps.get_db] = override_get_db
    try:
        token = create_access_token(user_id)
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/scans/analyze",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "source_type": "message",
                    "text": "Example scan content",
                    "save_to_history": True,
                },
            )

        assert response.status_code == 200, response.text
        db = session_factory()
        try:
            saved = db.scalar(select(ScanRecord))
            assert saved is not None
            assert json.loads(saved.model_analysis) == {
                "prediction": "legitimate",
                "fraud_score": 0.1,
            }
        finally:
            db.close()
    finally:
        app.dependency_overrides.pop(deps.get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
