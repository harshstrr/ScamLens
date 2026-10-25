import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text , Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc)

class ScanRecord(Base):
    __tablename__ = "scan_records"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True, nullable=False)
    
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    source_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    verdict: Mapped[str] = mapped_column(String(64), nullable=False)
    is_safe: Mapped[bool] = mapped_column(Boolean, nullable=False)
    primary_category: Mapped[str] = mapped_column(String(128), nullable=False)
    
    # Risk Metrics
    risk_level: Mapped[str] = mapped_column(String(24), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence: Mapped[str] = mapped_column(String(24), nullable=False)
    
    # Complex JSON Metrics
    critical_indicators: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    scores: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    
    # Textual Summaries
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    findings: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    recommendations: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    
    # System Fields
    analysis_version: Mapped[str] = mapped_column(String(32), default="heuristic-v1", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    owner: Mapped["Account"] = relationship(back_populates="scans")
