from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.errors import (
    ExportTooLargeError,
    InvalidAmountError,
    InvalidCategoryError,
    NotFoundError,
    TypeMismatchError,
)
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User


def _get_owned_category(db: Session, user: User, category_id: uuid.UUID) -> Category:
    cat = db.scalar(
        select(Category).where(
            Category.id == category_id, Category.user_id == user.id
        )
    )
    if not cat:
        raise InvalidCategoryError()
    return cat


def _validate_type_match(tx_type: str, cat_type: str) -> None:
    if tx_type != cat_type:
        raise TypeMismatchError()


def _apply_transaction_filters(
    stmt: Select,
    *,
    type_filter: str | None,
    category_id: uuid.UUID | None,
    date_from: date | None,
    date_to: date | None,
) -> Select:
    if type_filter:
        stmt = stmt.where(Transaction.type == type_filter)
    if category_id:
        stmt = stmt.where(Transaction.category_id == category_id)
    if date_from:
        stmt = stmt.where(Transaction.transaction_date >= date_from)
    if date_to:
        stmt = stmt.where(Transaction.transaction_date <= date_to)
    return stmt


def create_transaction(
    db: Session,
    user: User,
    *,
    type_: str,
    amount: Decimal,
    category_id: uuid.UUID,
    transaction_date: date,
    description: str | None = None,
    is_opening_balance: bool = False,
) -> Transaction:
    if amount <= 0:
        raise InvalidAmountError()
    if is_opening_balance and type_ != "income":
        raise TypeMismatchError()
    cat = _get_owned_category(db, user, category_id)
    _validate_type_match(type_, cat.type)
    tx = Transaction(
        user_id=user.id,
        category_id=category_id,
        type=type_,
        amount=amount,
        description=description,
        transaction_date=transaction_date,
        is_opening_balance=is_opening_balance,
    )
    db.add(tx)
    try:
        db.commit()
    except IntegrityError:
        # Race: kategori dihapus di tab lain antara validasi dan commit
        # (FK RESTRICT) -> 422 rapi, bukan 500.
        db.rollback()
        raise InvalidCategoryError()
    db.refresh(tx)
    # Eager-load category to avoid extra lazy query in response serialization.
    db.refresh(tx, attribute_names=["category"])
    return tx


def get_transaction(db: Session, user: User, transaction_id: uuid.UUID) -> Transaction:
    tx = db.scalar(
        select(Transaction)
        .options(joinedload(Transaction.category))
        .where(Transaction.id == transaction_id, Transaction.user_id == user.id)
    )
    if not tx:
        raise NotFoundError()
    return tx


def list_transactions(
    db: Session,
    user: User,
    *,
    page: int = 1,
    page_size: int = 20,
    type_filter: str | None = None,
    category_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[str, Any]:
    if page < 1:
        raise ValueError("page must be >= 1")
    if page_size < 1:
        raise ValueError("page_size must be >= 1")
    stmt = select(Transaction).where(Transaction.user_id == user.id)
    stmt = _apply_transaction_filters(
        stmt,
        type_filter=type_filter,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_items = db.scalar(count_stmt) or 0
    total_pages = max(1, -(-total_items // page_size))

    stmt = (
        stmt
        .options(joinedload(Transaction.category))
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(stmt).all())
    return {
        "items": items,
        "total_items": total_items,
        "total_pages": total_pages,
        "page": page,
        "page_size": page_size,
    }


def update_transaction(
    db: Session,
    user: User,
    transaction_id: uuid.UUID,
    *,
    type_: str | None = None,
    amount: Decimal | None = None,
    category_id: uuid.UUID | None = None,
    description: str | None = None,
    clear_description: bool = False,
    transaction_date: date | None = None,
) -> Transaction:
    tx = get_transaction(db, user, transaction_id)

    new_type = type_ if type_ is not None else tx.type
    new_category_id = category_id if category_id is not None else tx.category_id

    if type_ is not None or category_id is not None:
        cat = _get_owned_category(db, user, new_category_id)
        _validate_type_match(new_type, cat.type)

    if amount is not None:
        if amount <= 0:
            raise InvalidAmountError()
        tx.amount = amount
    if type_ is not None:
        tx.type = type_
    if category_id is not None:
        tx.category_id = category_id
    if clear_description:
        tx.description = None
    elif description is not None:
        tx.description = description
    if transaction_date is not None:
        tx.transaction_date = transaction_date

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise InvalidCategoryError()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, user: User, transaction_id: uuid.UUID) -> None:
    tx = get_transaction(db, user, transaction_id)
    db.delete(tx)
    db.commit()


def get_transactions_for_export(
    db: Session,
    user: User,
    *,
    type_filter: str | None = None,
    category_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 10000,
) -> list[Transaction]:
    stmt = select(Transaction).where(Transaction.user_id == user.id)
    stmt = _apply_transaction_filters(
        stmt,
        type_filter=type_filter,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
    )
    stmt = (
        stmt
        .options(joinedload(Transaction.category))
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(limit + 1)
    )
    rows = list(db.scalars(stmt).all())
    if len(rows) > limit:
        raise ExportTooLargeError(
            f"Export exceeds {limit} rows. Narrow the date range or filters."
        )
    return rows
