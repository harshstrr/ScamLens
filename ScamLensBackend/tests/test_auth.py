from fastapi.testclient import TestClient
import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.api.routes import auth as auth_route
from app.core import security
from app.core.config import Settings
from app.db.base import Base
from app.main import app


def test_secret_key_expires_after_30_days(monkeypatch):
    settings = Settings(jwt_secret="test-secret-that-is-long-enough-for-hs256", jwt_issuer="test-issuer")
    monkeypatch.setattr(security, "get_settings", lambda: settings)

    secret_key = security.create_secret_key("account-id")
    claims = jwt.decode(secret_key, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer)

    assert claims["exp"] - claims["iat"] == 30 * 24 * 60 * 60
    assert claims["type"] == "secret_key"


def test_refresh_rotates_secret_key_and_rejects_reuse(monkeypatch):
    settings = Settings(
        jwt_secret="test-secret-that-is-long-enough-for-hs256",
        jwt_issuer="test-issuer",
        google_client_id="test-client",
        access_token_minutes=5,
    )
    monkeypatch.setattr(security, "get_settings", lambda: settings)
    monkeypatch.setattr(auth_route, "get_settings", lambda: settings)

    def verify_id_token(token, request, audience):
        assert token == "x" * 20
        assert request is not None
        assert audience == "test-client"
        return {
            "sub": "google-account",
            "email": "user@example.com",
            "email_verified": True,
        }

    monkeypatch.setattr(
        auth_route.id_token,
        "verify_oauth2_token",
        verify_id_token,
    )

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[deps.get_db] = override_get_db
    try:
        with TestClient(app) as client:
            sign_in_response = client.post(
                "/api/v1/auth/google",
                json={"id_token": "x" * 20},
            )
            assert sign_in_response.status_code == 200
            original = sign_in_response.json()
            assert original["secret_key_expires_in"] == 30 * 24 * 60 * 60

            refresh_response = client.post(
                "/api/v1/auth/refresh",
                json={"secret_key": original["secret_key"]},
            )
            assert refresh_response.status_code == 200
            refreshed = refresh_response.json()
            assert refreshed["access_token"] != original["access_token"]
            assert refreshed["secret_key"] != original["secret_key"]
            assert client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {refreshed['access_token']}"},
            ).status_code == 200

            replay_response = client.post(
                "/api/v1/auth/refresh",
                json={"secret_key": original["secret_key"]},
            )
            assert replay_response.status_code == 401

            next_refresh_response = client.post(
                "/api/v1/auth/refresh",
                json={"secret_key": refreshed["secret_key"]},
            )
            assert next_refresh_response.status_code == 200
    finally:
        app.dependency_overrides.pop(deps.get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
