from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

SourceType = Literal["website", "message", "image_ocr", "quick_scan"]
RiskLevel = Literal["high", "medium", "low", "safe"]
ConfidenceLevel = Literal["low", "medium", "high", "very_high"]
VerdictLabel = Literal[
    "SCAM_OR_FRAUD_DETECTED",
    "SPAM_OR_HIGH_RISK",
    "LOW_RISK_CONTENT",
    "LEGITIMATE_CONTENT",
]


class Finding(BaseModel):
    code: str
    title: str
    detail: str
    severity: Literal["high", "medium", "low"]
    points: int = Field(ge=0, le=100)


class CategoryScores(BaseModel):
    fraud_score: float = Field(ge=0.0, le=1.0)
    spam_score: float = Field(ge=0.0, le=1.0)
    legitimate_score: float = Field(ge=0.0, le=1.0)


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=40000)
    source_url: str | None = Field(default=None, max_length=2048)
    source_type: SourceType
    source_title: str | None = Field(default=None, max_length=512)
    save_to_history: bool = False
    save_content: bool = False


class ScanResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str | None = None
    source_type: SourceType
    source_url: str | None = None
    source_title: str | None = None

    verdict: VerdictLabel
    is_safe: bool
    primary_category: Literal["fraud", "spam", "legitimate"]
    risk_level: RiskLevel
    risk_score: int = Field(ge=0, le=100)
    confidence: ConfidenceLevel
    critical_indicators: bool

    scores: CategoryScores
    summary: str
    findings: list[Finding] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)

    analysis_version: str
    created_at: datetime

class ScanItem(BaseModel):
    id: str
    source_type: str
    source_url: str | None
    source_title: str | None
    risk_level: str
    risk_score: int
    confidence: str
    summary: str
    findings: list[dict]
    recommendations: list[str]
    analysis_version: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
    
class ScanPage(BaseModel):
    items: list[ScanItem]
    page: int
    page_size: int
    total: int
