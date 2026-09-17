from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(
    month: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = get_dashboard_summary(db, current_user, month)
    except ValueError as exc:
        if "invalid_month" in str(exc):
            raise HTTPException(
                status_code=422,
                detail={"code": "VALIDATION_ERROR", "message": "Parameter month harus format YYYY-MM yang valid."},
            )
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        )
    return DashboardSummaryResponse(**data)
