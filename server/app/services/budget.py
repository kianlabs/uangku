"""Service layer untuk anggaran (budget) per kategori."""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.errors import InvalidAmountError, InvalidCategoryError
from app.core.month import parse_month
from app.models.budget import Budget
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


def list_budgets(
    db: Session, user: User, month_str: str | None = None
) -> dict[str, Any]:
    """Return semua budget user + pemakaian bulan *month_str* (jika diisi)."""
    date_from = date_to_exclusive = None
    if month_str is not None:
        date_from, date_to_exclusive = parse_month(month_str)

    budgets = list(
        db.scalars(
            select(Budget)
            .options(joinedload(Budget.category))
            .where(Budget.user_id == user.id)
            .order_by(Budget.created_at)
        ).all()
    )

    spent_by_category: dict[uuid.UUID, Decimal] = {}
    if date_from is not None and date_to_exclusive is not None:
        rows = db.execute(
            select(
                Transaction.category_id,
                func.sum(Transaction.amount).label("spent"),
            )
            .where(
                Transaction.user_id == user.id,
                Transaction.type == "expense",
                Transaction.transaction_date >= date_from,
                Transaction.transaction_date < date_to_exclusive,
            )
            .group_by(Transaction.category_id)
        ).all()
        spent_by_category = {
            row.category_id: Decimal(str(row.spent)) for row in rows
        }

    items = []
    earliest_created_at = None
    for b in budgets:
        amount = Decimal(str(b.amount))
        spent = spent_by_category.get(b.category_id)
        percentage = (
            round(float(spent / amount * 100), 2)
            if spent is not None and amount > 0
            else None
        )
        if earliest_created_at is None or b.created_at < earliest_created_at:
            earliest_created_at = b.created_at
        items.append({
            "category_id": b.category_id,
            "category_name": b.category.name,
            "type": b.category.type,
            "amount": amount,
            "spent": spent,
            "percentage": percentage,
        })
    return {
        "items": items,
        "month": month_str,
        "earliest_created_at": earliest_created_at,
    }


def upsert_budget(
    db: Session, user: User, category_id: uuid.UUID, amount: Decimal
) -> Budget:
    """Buat atau perbarui budget satu kategori (idempotent)."""
    if amount <= 0:
        raise InvalidAmountError()
    _get_owned_category(db, user, category_id)

    existing = db.scalar(
        select(Budget).where(
            Budget.user_id == user.id, Budget.category_id == category_id
        )
    )
    if existing:
        existing.amount = amount
        db.commit()
        db.refresh(existing)
        db.refresh(existing, attribute_names=["category"])
        return existing

    budget = Budget(user_id=user.id, category_id=category_id, amount=amount)
    db.add(budget)
    try:
        db.commit()
    except IntegrityError:
        # Race: baris dibuat konkuren → fallback ke update.
        db.rollback()
        existing = db.scalar(
            select(Budget).where(
                Budget.user_id == user.id, Budget.category_id == category_id
            )
        )
        if not existing:
            raise
        existing.amount = amount
        db.commit()
        db.refresh(existing)
        db.refresh(existing, attribute_names=["category"])
        return existing
    db.refresh(budget)
    db.refresh(budget, attribute_names=["category"])
    return budget


def delete_budget(db: Session, user: User, category_id: uuid.UUID) -> None:
    """Hapus budget satu kategori. Idempotent: tidak error jika tidak ada."""
    existing = db.scalar(
        select(Budget).where(
            Budget.user_id == user.id, Budget.category_id == category_id
        )
    )
    if existing:
        db.delete(existing)
        db.commit()
