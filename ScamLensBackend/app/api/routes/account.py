from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import current_user
from app.db.session import get_db
from app.models import Account

router = APIRouter()
@router.delete("")
def delete_account(db: Session = Depends(get_db), user: Account = Depends(current_user)):
    db.delete(user)
    db.commit()
    return {"status": "deleted"}
