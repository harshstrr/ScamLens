from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Account

bearer = HTTPBearer(auto_error=False)
def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> Account:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = decode_access_token(credentials.credentials)
    user = db.get(Account, uid)
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return user

def optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> Account | None:
    if credentials is None:
        return None
    uid = decode_access_token(credentials.credentials)
    user = db.get(Account, uid)
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return user
