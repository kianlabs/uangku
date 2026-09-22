from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import (
    AlreadyConfirmedError,
    DomainError,
    InvalidCategoryError,
    NotFoundError,
    RecurringInactiveError,
    TypeMismatchError,
)
from app.models.user import User
from app.schemas.recurring import (
    RecurringConfirmRequest,
    RecurringCreateRequest,
    RecurringListResponse,
    RecurringResponse,
    RecurringUpdateRequest,
)
from app.schemas.transaction import TransactionResponse
from app.services.recurring import (
    confirm_recurring,
    create_recurring,
    delete_recurring,
    list_recurring,
    update_recurring,
)

router = APIRouter(prefix="/recurring", tags=["recurring"])


def _to_response(rec) -> dict:
    return {
        "id": rec.id,
        "name": rec.name,
        "amount": rec.amount,
        "type": rec.type,
        "category_id": rec.category_id,
        "category_name": rec.category.name,
        "day": rec.day,
        "active": rec.active,
        "last_confirmed": rec.last_confirmed,
        "created_at": rec.created_at,
    }


@router.get("", response_model=RecurringListResponse)
def get_recurring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recs = list_recurring(db, current_user)
    return {"items": [RecurringResponse.model_validate(_to_response(r)) for r in recs]}


@router.post("", status_code=201, response_model=RecurringResponse)
def post_recurring(
    body: RecurringCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        rec = create_recurring(
            db, current_user,
            name=body.name,
            amount=body.amount,
            type_=body.type,
            category_id=body.category_id,
            day=body.day,
        )
    except InvalidCategoryError:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_CATEGORY", "message": "Category not found or not owned by user."},
        )
    except TypeMismatchError:
        raise HTTPException(
            status_code=422,
            detail={"code": "TYPE_MISMATCH", "message": "Recurring type does not match category type."},
        )
    except DomainError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        )
    return RecurringResponse.model_validate(_to_response(rec))


@router.patch("/{recurring_id}", response_model=RecurringResponse)
def patch_recurring(
    recurring_id: uuid.UUID,
    body: RecurringUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        rec = update_recurring(
            db, current_user, recurring_id,
            name=body.name,
            amount=body.amount,
            type_=body.type,
            category_id=body.category_id,
            day=body.day,
            active=body.active,
        )
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Recurring template not found."},
        )
    except InvalidCategoryError:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_CATEGORY", "message": "Category not found or not owned by user."},
        )
    except TypeMismatchError:
        raise HTTPException(
            status_code=422,
            detail={"code": "TYPE_MISMATCH", "message": "Recurring type does not match category type."},
        )
    except DomainError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        )
    return RecurringResponse.model_validate(_to_response(rec))


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring_endpoint(
    recurring_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delete_recurring(db, current_user, recurring_id)
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Recurring template not found."},
        )
    return Response(status_code=204)


@router.post("/{recurring_id}/confirm", status_code=201, response_model=TransactionResponse)
def confirm_recurring_endpoint(
    recurring_id: uuid.UUID,
    body: RecurringConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        tx = confirm_recurring(
            db, current_user, recurring_id,
            transaction_date=body.transaction_date,
        )
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Recurring template not found."},
        )
    except AlreadyConfirmedError:
        raise HTTPException(
            status_code=409,
            detail={"code": "ALREADY_CONFIRMED", "message": "Already confirmed this month."},
        )
    except RecurringInactiveError:
        raise HTTPException(
            status_code=409,
            detail={"code": "RECURRING_INACTIVE", "message": "Recurring template is paused."},
        )
    except (InvalidCategoryError, TypeMismatchError, DomainError) as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        )
    return TransactionResponse.model_validate(tx)
