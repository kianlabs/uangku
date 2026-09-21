from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import (
    DomainError,
    InvalidCategoryError,
    NotFoundError,
    TypeMismatchError,
)
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.category import CategoryType
from app.schemas.transaction import (
    PaginationMeta,
    TransactionCreateRequest,
    TransactionDetailResponse,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdatedResponse,
    TransactionUpdateRequest,
)
from app.services.transaction import (
    create_transaction,
    delete_transaction,
    get_transaction,
    list_transactions,
    update_transaction,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])

_NON_NULLABLE_PATCH_FIELDS = {"type", "amount", "category_id", "transaction_date"}


@router.get("", response_model=TransactionListResponse)
@limiter.limit("60/minute")
def get_transactions(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: CategoryType | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = list_transactions(
        db, current_user,
        page=page,
        page_size=page_size,
        type_filter=type,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
    )
    items = [TransactionResponse.model_validate(t) for t in result["items"]]
    return {
        "items": items,
        "pagination": PaginationMeta(
            page=result["page"],
            page_size=result["page_size"],
            total_items=result["total_items"],
            total_pages=result["total_pages"],
        ),
    }


@router.post("", status_code=201, response_model=TransactionResponse)
def post_transaction(
    body: TransactionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        tx = create_transaction(
            db, current_user,
            type_=body.type,
            amount=body.amount,
            category_id=body.category_id,
            transaction_date=body.transaction_date,
            description=body.description,
        )
    except InvalidCategoryError:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_CATEGORY", "message": "Category not found or not owned by user."},
        )
    except TypeMismatchError:
        raise HTTPException(
            status_code=422,
            detail={"code": "TYPE_MISMATCH", "message": "Transaction type does not match category type."},
        )
    except DomainError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        )
    return TransactionResponse.model_validate(tx)


@router.get("/{transaction_id}", response_model=TransactionDetailResponse)
def get_transaction_endpoint(
    transaction_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        tx = get_transaction(db, current_user, transaction_id)
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Transaction not found."},
        )
    return TransactionDetailResponse.model_validate(tx)


@router.patch("/{transaction_id}", response_model=TransactionUpdatedResponse)
def patch_transaction(
    transaction_id: uuid.UUID,
    body: TransactionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fields_set = body.model_fields_set

    # type, amount, category_id, transaction_date must not be sent as explicit null
    for field in _NON_NULLABLE_PATCH_FIELDS:
        if field in fields_set and getattr(body, field) is None:
            raise HTTPException(
                status_code=422,
                detail={"code": "VALIDATION_ERROR", "message": f"{field} cannot be null."},
            )

    # description: unset = no change, null = clear, str = update
    clear_description = "description" in fields_set and body.description is None
    description = body.description if ("description" in fields_set and body.description is not None) else None

    try:
        tx = update_transaction(
            db, current_user, transaction_id,
            type_=body.type,
            amount=body.amount,
            category_id=body.category_id,
            description=description,
            clear_description=clear_description,
            transaction_date=body.transaction_date,
        )
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Transaction not found."},
        )
    except InvalidCategoryError:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_CATEGORY", "message": "Category not found or not owned by user."},
        )
    except TypeMismatchError:
        raise HTTPException(
            status_code=422,
            detail={"code": "TYPE_MISMATCH", "message": "Transaction type does not match category type."},
        )
    except DomainError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        )
    return TransactionUpdatedResponse.model_validate(tx)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction_endpoint(
    transaction_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delete_transaction(db, current_user, transaction_id)
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Transaction not found."},
        )
    return Response(status_code=204)
