from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

SourceType = Literal["website", "message", "image_ocr", "quick_scan"]

RiskLevel = Literal["high", "medium", "low", "inconclusive"]
ConfidenceLevel = Literal["low", "medium", "high"]
PredictionLabel = Literal[
    "scam",
    "fraud",
    "spam",
    "suspicious",
    "low_risk",
    "legitimate",
    "safe",
    "inconclusive",
    "unknown",
    "unavailable",
]


class Finding(BaseModel):
    code: str
    title: str
    detail: str
    severity: Literal["high", "medium", "low"]
    points: int = Field(ge=0, le=100)


class ModelAnalysis(BaseModel):
    available: bool
    model: str | None = None
    fraud_score: float | None = Field(default=None, ge=0, le=1)
    spam_score: float | None = Field(default=None, ge=0, le=1)
    legitimate_score: float | None = Field(default=None, ge=0, le=1)
    prediction: str | None = None
    error: str | None = None


class CodePrediction(BaseModel):
    prediction: PredictionLabel
    risk_score: int = Field(ge=0, le=100)
    finding_count: int = Field(ge=0)
    critical_indicators: bool


class CombinedPrediction(BaseModel):
    heuristic_prediction: str
    heuristic_score: int = Field(ge=0, le=100)

    model_prediction: str
    model_score: int | None = Field(default=None, ge=0, le=100)
    model_available: bool

    final_prediction: PredictionLabel
    final_risk_level: RiskLevel
    final_risk_score: int = Field(ge=0, le=100)

    agreement: bool | None = None
    method: str


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=40000)
    source_url: str | None = Field(default=None, max_length=2048)
    source_type: str
    source_title: str | None = Field(default=None, max_length=512)
    save_to_history: bool = False
    save_content: bool = False


class ScanResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str | None = None
    source_type: str
    source_url: str | None = None
    source_title: str | None = None

    risk_level: RiskLevel
    risk_score: int = Field(ge=0, le=100)
    confidence: ConfidenceLevel

    summary: str
    findings: list[Finding] = Field(default_factory=list)
    model_analysis: ModelAnalysis
    recommendations: list[str] = Field(default_factory=list)

    # New prediction objects
    code_prediction: CodePrediction
    combined_prediction: CombinedPrediction

    analysis_version: str
    created_at: datetime
    saved_to_history: bool = False    


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
