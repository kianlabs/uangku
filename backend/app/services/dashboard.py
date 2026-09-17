from __future__ import annotations

import re
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User


def _parse_month(month_str: str) -> tuple[date, date]:
    if not re.fullmatch(r"\d{4}-\d{2}", month_str):
        raise ValueError("invalid_month")
    try:
        parts = month_str.split("-")
        year, month = int(parts[0]), int(parts[1])
        if not (1 <= month <= 12):
            raise ValueError
        date_from = date(year, month, 1)
    except (ValueError, OverflowError):
        raise ValueError("invalid_month")

    if month == 12:
        date_to_exclusive = date(year + 1, 1, 1)
    else:
        date_to_exclusive = date(year, month + 1, 1)
    return date_from, date_to_exclusive


def get_dashboard_summary(
    db: Session,
    user: User,
    month_str: str,
) -> dict[str, Any]:
    date_from, date_to_exclusive = _parse_month(month_str)

    # Query 1: all-time balance
    balance_row = db.execute(
        select(
            func.coalesce(
                func.sum(Transaction.amount).filter(Transaction.type == "income"), 0
            ).label("total_income"),
            func.coalesce(
                func.sum(Transaction.amount).filter(Transaction.type == "expense"), 0
            ).label("total_expense"),
        ).where(Transaction.user_id == user.id)
    ).one()
    balance = Decimal(str(balance_row.total_income)) - Decimal(str(balance_row.total_expense))

    # Query 2: monthly aggregates
    monthly_row = db.execute(
        select(
            func.coalesce(
                func.sum(Transaction.amount).filter(Transaction.type == "income"), 0
            ).label("monthly_income"),
            func.coalesce(
                func.sum(Transaction.amount).filter(Transaction.type == "expense"), 0
            ).label("monthly_expense"),
            func.count(Transaction.id).label("transaction_count"),
        ).where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date < date_to_exclusive,
        )
    ).one()
    monthly_income = Decimal(str(monthly_row.monthly_income))
    monthly_expense = Decimal(str(monthly_row.monthly_expense))
    transaction_count = monthly_row.transaction_count

    # Query 3: expense by category
    cat_rows = db.execute(
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.sum(Transaction.amount).label("amount"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date < date_to_exclusive,
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Transaction.amount).desc(), Category.name.asc())
    ).all()

    expense_by_category = []
    for row in cat_rows:
        amount = Decimal(str(row.amount))
        pct = round(float(amount / monthly_expense * 100), 2) if monthly_expense else 0.0
        expense_by_category.append({
            "category_id": row.category_id,
            "category_name": row.category_name,
            "amount": amount,
            "percentage": pct,
        })

    # Query 4: recent transactions (month-filtered, limit 5)
    recent_txs = db.scalars(
        select(Transaction)
        .options(joinedload(Transaction.category))
        .where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date < date_to_exclusive,
        )
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(5)
    ).all()

    recent_transactions = [
        {
            "id": tx.id,
            "type": tx.type,
            "amount": tx.amount,
            "description": tx.description,
            "transaction_date": tx.transaction_date,
            "category_name": tx.category.name,
        }
        for tx in recent_txs
    ]

    return {
        "period": month_str,
        "balance": balance,
        "monthly_income": monthly_income,
        "monthly_expense": monthly_expense,
        "transaction_count": transaction_count,
        "expense_by_category": expense_by_category,
        "recent_transactions": recent_transactions,
    }
