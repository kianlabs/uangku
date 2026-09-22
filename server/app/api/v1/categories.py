from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import (
    CategoryInUseError,
    DomainError,
    DuplicateCategoryError,
    LastCategoryError,
    NotFoundError,
    TypeMismatchError,
)
from app.models.user import User
from app.schemas.category import (
    CategoryCreateRequest,
    CategoryDetailResponse,
    CategoryListResponse,
    CategoryResponse,
    CategoryTransferRequest,
    CategoryTransferResponse,
    CategoryType,
    CategoryUpdatedResponse,
    CategoryUpdateRequest,
)
from app.services.category import (
    create_category,
    delete_category,
    list_categories,
    transfer_category,
    update_category,
)

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=CategoryListResponse)
def get_categories(
    type: CategoryType | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cats = list_categories(db, current_user, type_filter=type)
    return {"items": [CategoryResponse.model_validate(c).model_dump() for c in cats]}


@router.post("", status_code=201, response_model=CategoryDetailResponse)
def post_category(
    body: CategoryCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        cat = create_category(db, current_user, name=body.name, type_=body.type)
    except DuplicateCategoryError:
        raise HTTPException(
            status_code=409,
            detail={"code": "CATEGORY_ALREADY_EXISTS", "message": "Category already exists."},
        )
    except DomainError as exc:
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST", "message": str(exc)})
    return cat


@router.patch("/{category_id}", response_model=CategoryUpdatedResponse)
def patch_category(
    category_id: uuid.UUID,
    body: CategoryUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        cat = update_category(db, current_user, category_id, name=body.name)
    except DuplicateCategoryError:
        raise HTTPException(
            status_code=409,
            detail={"code": "CATEGORY_ALREADY_EXISTS", "message": "Category already exists."},
        )
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Category not found."},
        )
    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category_endpoint(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delete_category(db, current_user, category_id)
    except LastCategoryError:
        raise HTTPException(
            status_code=409,
            detail={"code": "CATEGORY_IS_LAST", "message": "Cannot delete the last category of this type."},
        )
    except CategoryInUseError:
        raise HTTPException(
            status_code=409,
            detail={"code": "CATEGORY_IN_USE", "message": "Category is still used by transactions."},
        )
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Category not found."},
        )
    return Response(status_code=204)


@router.post("/{category_id}/transfer", response_model=CategoryTransferResponse)
def transfer_category_endpoint(
    category_id: uuid.UUID,
    body: CategoryTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        moved = transfer_category(db, current_user, category_id, body.to_category_id)
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Category not found."},
        )
    except TypeMismatchError:
        raise HTTPException(
            status_code=422,
            detail={"code": "TYPE_MISMATCH", "message": "Categories must be of the same type."},
        )
    except CategoryInUseError:
        raise HTTPException(
            status_code=409,
            detail={"code": "CATEGORY_IN_USE", "message": "Category changed during transfer."},
        )
    except DomainError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "BAD_REQUEST", "message": str(exc)},
        )
    return {"moved": moved}
