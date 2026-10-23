from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import jwt
from fastapi import HTTPException
from jwt import InvalidTokenError
from app.core.config import get_settings

SECRET_KEY_EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60


def create_secret_key(user_id: str) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iss": s.jwt_issuer, "iat": now, "jti": secrets.token_urlsafe(16),
               "exp": now + timedelta(seconds=SECRET_KEY_EXPIRES_IN_SECONDS), "type": "secret_key"}
    return jwt.encode(payload, s.jwt_secret, algorithm="HS256")


def decode_secret_key(secret_key: str) -> str:
    s = get_settings()
    try:
        payload = jwt.decode(secret_key, s.jwt_secret, algorithms=["HS256"], issuer=s.jwt_issuer,
                             options={"require": ["sub", "iss", "iat", "exp"]})
        if payload.get("type") != "secret_key":
            raise InvalidTokenError("Wrong token type")
        return str(payload["sub"])
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired secret key") from exc


def hash_secret_key(secret_key: str) -> str:
    return hashlib.sha256(secret_key.encode("utf-8")).hexdigest()


def create_access_token(user_id: str) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iss": s.jwt_issuer, "iat": now, "jti": secrets.token_urlsafe(16),
               "exp": now + timedelta(minutes=s.access_token_minutes), "type": "access"}
    return jwt.encode(payload, s.jwt_secret, algorithm="HS256")

def decode_access_token(token: str) -> str:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.jwt_secret, algorithms=["HS256"], issuer=s.jwt_issuer,
                             options={"require": ["sub", "iss", "iat", "exp"]})
        if payload.get("type") != "access":
            raise InvalidTokenError("Wrong token type")
        return str(payload["sub"])
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc
