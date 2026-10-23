from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from app.api.deps import current_user
from app.core.config import get_settings
from app.core.security import (
    SECRET_KEY_EXPIRES_IN_SECONDS,
    create_access_token,
    create_secret_key,
    decode_secret_key,
    hash_secret_key,
)
from app.db.session import get_db
from app.models import Account
from app.schemas.auth import AccountOut, AuthResponse, GoogleSignInRequest, RefreshToken

router = APIRouter()


@router.post("/google", response_model=AuthResponse)
def google_sign_in(body: GoogleSignInRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured; set GOOGLE_CLIENT_ID")
    try:
        claims = id_token.verify_oauth2_token(body.id_token, google_requests.Request(), settings.google_client_id)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Google ID token is invalid or expired") from exc
    sub, email = claims.get("sub"), claims.get("email")
    if not sub or not email or not claims.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google account must have a verified email")
    user = db.scalar(select(Account).where(Account.google_sub == sub))
    if user is None:
        user = Account(google_sub=sub, email=email, display_name=claims.get("name"), picture_url=claims.get("picture"))
        db.add(user)
    else:
        user.email, user.display_name, user.picture_url = email, claims.get("name"), claims.get("picture")
    db.flush()
    access_token = create_access_token(user.id)
    secret_key = create_secret_key(user.id)
    user.refresh_token_hash = hash_secret_key(secret_key)
    db.commit()
    db.refresh(user)
    return AuthResponse(
        access_token=access_token,
        secret_key=secret_key,
        expires_in=settings.access_token_minutes * 60,
        secret_key_expires_in=SECRET_KEY_EXPIRES_IN_SECONDS,
        user=AccountOut.model_validate(user),
    )


@router.post("/refresh", response_model=AuthResponse)
def refresh_access_token(body: RefreshToken, db: Session = Depends(get_db)):
    user_id = decode_secret_key(body.secret_key)
    user = db.get(Account, user_id)
    if user is None or user.refresh_token_hash != hash_secret_key(body.secret_key):
        raise HTTPException(status_code=401, detail="Invalid or expired secret key")

    access_token = create_access_token(user.id)
    new_secret_key = create_secret_key(user.id)
    result = db.execute(
        update(Account)
        .where(Account.id == user.id, Account.refresh_token_hash == hash_secret_key(body.secret_key))
        .values(refresh_token_hash=hash_secret_key(new_secret_key))
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=401, detail="Invalid or expired secret key")
    db.commit()
    return AuthResponse(
        access_token=access_token,
        secret_key=new_secret_key,
        expires_in=get_settings().access_token_minutes * 60,
        secret_key_expires_in=SECRET_KEY_EXPIRES_IN_SECONDS,
        user=AccountOut.model_validate(user),
    )

@router.get("/me", response_model=AccountOut)
def me(user: Account = Depends(current_user)):
    return AccountOut.model_validate(user)

@router.post("/logout")
def logout():
    return {"status": "ok", "message": "Discard the local access token. Server-side revocation is not implemented in this starter."}
