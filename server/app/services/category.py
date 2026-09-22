from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import exists, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import (
    CategoryInUseError,
    DomainError,
    DuplicateCategoryError,
    LastCategoryError,
    NotFoundError,
    TypeMismatchError,
)
from app.models.budget import Budget
from app.models.category import Category
from app.models.recurring import RecurringTemplate
from app.models.transaction import Transaction
from app.models.user import User


def list_categories(
    db: Session, user: User, type_filter: str | None = None
) -> list[Category]:
    stmt = select(Category).where(Category.user_id == user.id)
    if type_filter:
        stmt = stmt.where(Category.type == type_filter)
    stmt = stmt.order_by(Category.name)
    return list(db.scalars(stmt).all())


def create_category(db: Session, user: User, name: str, type_: str) -> Category:
    cat = Category(user_id=user.id, name=name, type=type_)
    db.add(cat)
    try:
        db.flush()
        db.commit()
        db.refresh(cat)
    except IntegrityError:
        db.rollback()
        raise DuplicateCategoryError()
    return cat


def update_category(
    db: Session, user: User, category_id: uuid.UUID, name: str
) -> Category:
    cat = db.scalar(
        select(Category).where(
            Category.id == category_id, Category.user_id == user.id
        )
    )
    if not cat:
        raise NotFoundError()
    cat.name = name
    try:
        db.flush()
        db.commit()
        db.refresh(cat)
    except IntegrityError:
        db.rollback()
        raise DuplicateCategoryError()
    return cat


def delete_category(db: Session, user: User, category_id: uuid.UUID) -> None:
    cat = db.scalar(
        select(Category).where(
            Category.id == category_id, Category.user_id == user.id
        )
    )
    if not cat:
        raise NotFoundError()
    remaining = db.scalar(
        select(func.count())
        .select_from(Category)
        .where(Category.user_id == user.id, Category.type == cat.type)
    ) or 0
    if remaining <= 1:
        raise LastCategoryError()
    in_use = db.scalar(
        select(exists().where(
            Transaction.category_id == category_id,
            Transaction.user_id == user.id,
        ))
    ) or db.scalar(
        select(exists().where(
            RecurringTemplate.category_id == category_id,
            RecurringTemplate.user_id == user.id,
        ))
    )
    if in_use:
        raise CategoryInUseError()
    # Budget dihapus eksplisit: ORM tanpa cascade akan NULL-kan FK (NOT NULL).
    for budget in list(cat.budgets):
        db.delete(budget)
    try:
        db.delete(cat)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CategoryInUseError()


def transfer_category(
    db: Session, user: User, category_id: uuid.UUID, to_category_id: uuid.UUID
) -> int:
    """Pindahkan transaksi, budget, dan pengingat ke kategori lain lalu
    hapus asal. Atomik: satu commit."""
    if category_id == to_category_id:
        raise DomainError("cannot_transfer_to_itself")
    src = db.scalar(
        select(Category).where(
            Category.id == category_id, Category.user_id == user.id
        )
    )
    dst = db.scalar(
        select(Category).where(
            Category.id == to_category_id, Category.user_id == user.id
        )
    )
    if not src or not dst:
        raise NotFoundError()
    if src.type != dst.type:
        raise TypeMismatchError()

    result = db.execute(
        update(Transaction)
        .where(
            Transaction.user_id == user.id,
            Transaction.category_id == src.id,
        )
        .values(category_id=dst.id)
    )
    moved = result.rowcount or 0

    db.execute(
        update(RecurringTemplate)
        .where(
            RecurringTemplate.user_id == user.id,
            RecurringTemplate.category_id == src.id,
        )
        .values(category_id=dst.id)
    )

    src_budget = db.scalar(
        select(Budget).where(
            Budget.user_id == user.id, Budget.category_id == src.id
        )
    )
    if src_budget is not None:
        dst_budget = db.scalar(
            select(Budget).where(
                Budget.user_id == user.id, Budget.category_id == dst.id
            )
        )
        if dst_budget is not None:
            dst_budget.amount = Decimal(str(dst_budget.amount)) + Decimal(
                str(src_budget.amount)
            )
            db.delete(src_budget)
        else:
            src_budget.category_id = dst.id
    try:
        db.delete(src)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CategoryInUseError()
    return moved
