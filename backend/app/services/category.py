from __future__ import annotations

import uuid

from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import (
    CategoryInUseError,
    DuplicateCategoryError,
    NotFoundError,
)
from app.models.category import Category
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
    in_use = db.scalar(
        select(exists().where(
            Transaction.category_id == category_id,
            Transaction.user_id == user.id,
        ))
    )
    if in_use:
        raise CategoryInUseError()
    try:
        db.delete(cat)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CategoryInUseError()
