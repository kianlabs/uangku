"""Service layer untuk pengingat transaksi berulang (manual, bukan auto-debit)."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.errors import (
    AlreadyConfirmedError,
    InvalidAmountError,
    InvalidCategoryError,
    NotFoundError,
    RecurringInactiveError,
    TypeMismatchError,
)
from app.models.category import Category
from app.models.recurring import RecurringTemplate
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.common import today_utc
from app.services.transaction import create_transaction


def _get_owned(db: Session, user: User, recurring_id: uuid.UUID) -> RecurringTemplate:
    rec = db.scalar(
        select(RecurringTemplate)
        .options(joinedload(RecurringTemplate.category))
        .where(RecurringTemplate.id == recurring_id, RecurringTemplate.user_id == user.id)
    )
    if not rec:
        raise NotFoundError()
    return rec


def _get_owned_category(db: Session, user: User, category_id: uuid.UUID) -> Category:
    cat = db.scalar(
        select(Category).where(
            Category.id == category_id, Category.user_id == user.id
        )
    )
    if not cat:
        raise InvalidCategoryError()
    return cat


def list_recurring(db: Session, user: User) -> list[RecurringTemplate]:
    stmt = (
        select(RecurringTemplate)
        .options(joinedload(RecurringTemplate.category))
        .where(RecurringTemplate.user_id == user.id)
        .order_by(RecurringTemplate.created_at)
    )
    return list(db.scalars(stmt).all())


def create_recurring(
    db: Session,
    user: User,
    *,
    name: str,
    amount: Decimal,
    type_: str,
    category_id: uuid.UUID,
    day: int,
) -> RecurringTemplate:
    if amount <= 0:
        raise InvalidAmountError()
    cat = _get_owned_category(db, user, category_id)
    if type_ != cat.type:
        raise TypeMismatchError()
    rec = RecurringTemplate(
        user_id=user.id,
        category_id=category_id,
        type=type_,
        name=name,
        amount=amount,
        day=day,
        active=True,
    )
    db.add(rec)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise InvalidCategoryError()
    db.refresh(rec)
    db.refresh(rec, attribute_names=["category"])
    return rec


def update_recurring(
    db: Session,
    user: User,
    recurring_id: uuid.UUID,
    *,
    name: str | None = None,
    amount: Decimal | None = None,
    type_: str | None = None,
    category_id: uuid.UUID | None = None,
    day: int | None = None,
    active: bool | None = None,
) -> RecurringTemplate:
    rec = _get_owned(db, user, recurring_id)

    new_type = type_ if type_ is not None else rec.type
    new_category_id = category_id if category_id is not None else rec.category_id
    if type_ is not None or category_id is not None:
        cat = _get_owned_category(db, user, new_category_id)
        if new_type != cat.type:
            raise TypeMismatchError()

    if name is not None:
        rec.name = name
    if amount is not None:
        if amount <= 0:
            raise InvalidAmountError()
        rec.amount = amount
    if type_ is not None:
        rec.type = type_
    if category_id is not None:
        rec.category_id = category_id
    if day is not None:
        rec.day = day
    if active is not None:
        rec.active = active

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise InvalidCategoryError()
    db.refresh(rec)
    db.refresh(rec, attribute_names=["category"])
    return rec


def delete_recurring(db: Session, user: User, recurring_id: uuid.UUID) -> None:
    rec = _get_owned(db, user, recurring_id)
    db.delete(rec)
    db.commit()


def confirm_recurring(
    db: Session,
    user: User,
    recurring_id: uuid.UUID,
    transaction_date: date | None = None,
) -> Transaction:
    """Catat transaksi dari template + cap bulan ini. Idempotent per bulan."""
    rec = _get_owned(db, user, recurring_id)
    if not rec.active:
        raise RecurringInactiveError()
    tx_date = transaction_date or today_utc()
    if rec.last_confirmed is not None and (
        rec.last_confirmed.year, rec.last_confirmed.month
    ) == (tx_date.year, tx_date.month):
        raise AlreadyConfirmedError()
    cat = _get_owned_category(db, user, rec.category_id)
    if rec.type != cat.type:
        raise TypeMismatchError()

    # BUG-4: Update last_confirmed sebelum create_transaction agar keduanya
    # ter-commit secara atomik dalam satu transaksi di create_transaction(),
    # mencegah race condition dan double commit jika commit kedua gagal.
    rec.last_confirmed = tx_date

    tx = create_transaction(
        db, user,
        type_=rec.type,
        amount=Decimal(str(rec.amount)),
        category_id=rec.category_id,
        transaction_date=tx_date,
        description=rec.name,
    )
    return tx
