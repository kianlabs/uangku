from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import DomainError, InvalidMonthError
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    DashboardSummaryResponse,
    DemoDataResponse,
)
from app.services.dashboard import get_dashboard_summary, get_user_metrics
from app.services.demo import seed_demo_data

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
@limiter.limit("60/minute")
def dashboard_summary(
    request: Request,
    month: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = get_dashboard_summary(db, current_user, month)
    except InvalidMonthError:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": "Parameter month harus format YYYY-MM yang valid."},
        )
    except DomainError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        )
    return DashboardSummaryResponse(**data)


@router.get("/metrics", response_model=DashboardMetricsResponse)
@limiter.limit("60/minute")
def dashboard_metrics(
    request: Request,
    payday: int = Query(1, ge=1, le=31),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return streak dates, weekly expense, and safe-to-spend in one request.

    Replaces the N-page ``loadMetricTransactions`` loop in the client.

    Query params:
        payday (int, 1-31): Day of month the user gets paid. Default 1.
    """
    data = get_user_metrics(db, current_user, payday=payday)
    return DashboardMetricsResponse(**data)


@router.post("/demo-data", response_model=DemoDataResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("2/minute")
def create_demo_data(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Isi data contoh (3 minggu transaksi + 2 budget) untuk user baru.

    Dipakai tombol "Isi contoh data" di akhir onboarding MochiGuide.
    Tolak dengan 409 kalau user sudah punya transaksi.
    """
    try:
        result = seed_demo_data(db, current_user)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_HAS_DATA", "message": str(exc)},
        )
    return DemoDataResponse(**result)
