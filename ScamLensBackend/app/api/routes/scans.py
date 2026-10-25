import json
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, delete
from sqlalchemy.orm import Session
from app.api.deps import current_user, optional_user
from app.db.session import get_db
from app.models import Account, ScanRecord
from app.schemas.scan import AnalyzeRequest, ScanItem, ScanPage, ScanResult
from app.services.analyzer import analyze
from datetime import datetime, timezone

router = APIRouter()


@router.post("/analyze", response_model=ScanResult)
def analyze_scan(
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
    user: Account | None = Depends(optional_user),
):
    # 1. Require authentication only when saving to history
    if body.save_to_history and user is None:
        raise HTTPException(
            status_code=401,
            detail=(
                "Sign in to save scans to cloud history; "
                "use save_to_history=false for guest analysis"
            ),
        )

    # 2. Run deterministic code-only heuristic analysis
    result = analyze(body.text, body.source_url)

    scan_id = None
    saved = False

    # 3. Persist record if authenticated and requested
    if body.save_to_history and user is not None:
        row = ScanRecord(
    user_id=user.id,
    source_type=body.source_type,
    source_url=body.source_url,
    source_title=body.source_title,
    content=body.text if body.save_content else None,
    verdict=result["verdict"],  # <-- Added
    is_safe=result["is_safe"],  # <-- Added
    primary_category=result["primary_category"],  # <-- Added
    risk_level=result["risk_level"],
    risk_score=result["risk_score"],
    confidence=result["confidence"],
    critical_indicators=result["critical_indicators"],  # <-- Added
    scores=result["scores"],  # <-- Added
    summary=result["summary"],
    findings=result["findings"],
    recommendations=result["recommendations"],
    analysis_version=result["analysis_version"],
    # Let database/model handle default id & created_at unless manually overriding
)


        try:
            db.add(row)
            db.commit()
            db.refresh(row)
            scan_id = str(row.id)
            saved = True
        except Exception:
            db.rollback()
            raise

    # 4. Construct clean response
    return ScanResult(
        id=scan_id,
        source_type=body.source_type,
        source_url=body.source_url,
        source_title=body.source_title,
        created_at=result.get("created_at", datetime.now(timezone.utc)),
        verdict=result["verdict"],
        is_safe=result["is_safe"],
        primary_category=result["primary_category"],
        risk_level=result["risk_level"],
        risk_score=result["risk_score"],
        confidence=result["confidence"],
        critical_indicators=result["critical_indicators"],
        scores=result["scores"],
        summary=result["summary"],
        findings=result["findings"],
        recommendations=result["recommendations"],
        analysis_version=result["analysis_version"],
    )

 
@router.get("", response_model=ScanPage)
def list_scans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Account = Depends(current_user)
):
    total = db.scalar(
        select(func.count())
        .select_from(ScanRecord)
        .where(ScanRecord.user_id == user.id)
    ) or 0
    rows = db.scalars(
        select(ScanRecord)
        .where(ScanRecord.user_id == user.id)
        .order_by(ScanRecord.created_at.desc())
        .offset((page-1)*page_size).limit(page_size)
    ).all()
    
    return ScanPage(items=[ScanItem.model_validate(row) for row in rows], page=page, page_size=page_size, total=total)

@router.delete("")
def delete_all_scan(db: Session = Depends(get_db), user: Account = Depends(current_user)):
    stmt = delete(ScanRecord).where(ScanRecord.user_id == user.id)
    result = db.execute(stmt)
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No scan records found to delete"
        )
    db.commit()
    
    return {"status": "deleted", "count": result.rowcount}

@router.get("/{scan_id}", response_model=ScanResult)
def get_scan(scan_id: str, db: Session = Depends(get_db), user: Account = Depends(current_user)):
    row = db.scalar(
        select(ScanRecord).where(
            ScanRecord.id == scan_id, 
            ScanRecord.user_id == user.id
        )
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    return ScanResult(
        id=row.id,
        source_type=row.source_type,
        source_url=row.source_url,
        source_title=row.source_title,
        created_at=row.created_at,
        verdict=row.verdict,
        is_safe=row.is_safe,
        primary_category=row.primary_category,
        risk_level=row.risk_level,
        risk_score=row.risk_score,
        confidence=row.confidence,
        critical_indicators=row.critical_indicators,
        scores=row.scores,
        summary=row.summary,
        findings=row.findings,
        recommendations=row.recommendations,
        analysis_version=row.analysis_version,
    )

    
    

@router.delete("/{scan_id}")
def delete_scan(scan_id: str, db: Session = Depends(get_db), user: Account = Depends(current_user)):
    row = db.scalar(select(ScanRecord).where(ScanRecord.id == scan_id, ScanRecord.user_id == user.id))
    if row is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    db.delete(row)
    db.commit()
    return {"status": "deleted", "id": scan_id}
