import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc)

class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    google_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    picture_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    scans: Mapped[list["ScanRecord"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
