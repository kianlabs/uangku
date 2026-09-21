from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import DomainError, InvalidCategoryError, InvalidMonthError
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.budget import BudgetListResponse, BudgetResponse, BudgetUpsertRequest
from app.services.budget import delete_budget, list_budgets, upsert_budget

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=BudgetListResponse)
@limiter.limit("60/minute")
def get_budgets(
    request: Request,
    month: str | None = Query(None, description="Bulan YYYY-MM untuk hitung pemakaian."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = list_budgets(db, current_user, month_str=month)
    except InvalidMonthError:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": "Parameter month harus format YYYY-MM yang valid."},
        )
    return result


@router.put("/{category_id}", response_model=BudgetResponse)
@limiter.limit("60/minute")
def put_budget(
    category_id: uuid.UUID,
    body: BudgetUpsertRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        budget = upsert_budget(db, current_user, category_id, body.amount)
    except InvalidCategoryError:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_CATEGORY", "message": "Category not found or not owned by user."},
        )
    except DomainError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        )
    return {
        "category_id": budget.category_id,
        "category_name": budget.category.name,
        "type": budget.category.type,
        "amount": budget.amount,
        "spent": None,
        "percentage": None,
    }


@router.delete("/{category_id}", status_code=204)
def delete_budget_endpoint(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_budget(db, current_user, category_id)
    return Response(status_code=204)
