from fastapi import APIRouter
from app.api.routes import account, auth, scans, system
router = APIRouter()
router.include_router(system.router, tags=["system"])
router.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
router.include_router(scans.router, prefix="/api/v1/scans", tags=["scans"])
router.include_router(account.router, prefix="/api/v1/account", tags=["account"])
