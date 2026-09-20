"""Service layer untuk dashboard aggregations.

Berisi dua fungsi publik utama:
- ``get_dashboard_summary`` — ringkasan bulanan (4 query)
- ``get_user_metrics``      — data untuk streak, weekly reflection, safe-to-spend
"""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.month import parse_month as _parse_month
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User


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


# ---------------------------------------------------------------------------
# User metrics (streak, weekly expense, safe-to-spend)
# ---------------------------------------------------------------------------

def _days_until_next_payday(today: date, payday: int) -> int:
    """Return number of days from *today* (exclusive) until the next payday.

    If payday is today, the target moves to next month's payday (e.g. ~30 days),
    so the daily budget spreads over the full cycle. If payday already passed
    this month, target is next month's payday.
    Clamps the payday day to the last day of the target month to handle
    months shorter than 31 days (e.g. payday=31 in February → Feb 28/29).
    """
    import calendar

    def _clamp_day(year: int, month: int, day: int) -> date:
        max_day = calendar.monthrange(year, month)[1]
        return date(year, month, min(day, max_day))

    next_pay = _clamp_day(today.year, today.month, payday)
    if next_pay <= today:
        # Move to next month
        if today.month == 12:
            next_pay = _clamp_day(today.year + 1, 1, payday)
        else:
            next_pay = _clamp_day(today.year, today.month + 1, payday)

    return (next_pay - today).days


def get_user_metrics(
    db: Session,
    user: User,
    payday: int = 1,
    today: date | None = None,
) -> dict[str, Any]:
    """Return computed metrics for the beranda dashboard.

    Replaces the frontend ``loadMetricTransactions`` pagination loop.

    Queries:
    1. Distinct transaction_date for the last 60 days → streak input
    2. Expense totals grouped by category for the last 7 days → weekly reflection
    3. Current-month income / expense / tagihan totals → safe-to-spend

    Args:
        payday: Day of month the user gets paid (1-31). Used for safe-to-spend.
        today:  Override today's date (for testing).
    """
    if not 1 <= payday <= 31:
        raise ValueError("payday must be between 1 and 31")
    if today is None:
        today = datetime.now(UTC).date()

    cutoff_streak = today - timedelta(days=60)
    cutoff_week = today - timedelta(days=6)   # last 7 days inclusive

    # -- Query 1: distinct dates for streak (60-day window) --
    date_rows = db.scalars(
        select(Transaction.transaction_date)
        .where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= cutoff_streak,
            Transaction.transaction_date <= today,
        )
        .distinct()
        .order_by(Transaction.transaction_date.desc())
    ).all()
    transaction_dates = [str(d) for d in date_rows]  # "YYYY-MM-DD"

    # -- Query 2: weekly expense by category --
    week_rows = db.execute(
        select(
            Category.name.label("category_name"),
            func.sum(Transaction.amount).label("amount"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= cutoff_week,
            Transaction.transaction_date <= today,
        )
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
    ).all()

    week_expense_total = Decimal(0)
    week_top_category: str | None = None
    for row in week_rows:
        amount = Decimal(str(row.amount))
        week_expense_total += amount
        if week_top_category is None:
            week_top_category = row.category_name

    # -- Query 3: current-month totals for safe-to-spend --
    month_start = date(today.year, today.month, 1)
    if today.month == 12:
        month_end_exclusive = date(today.year + 1, 1, 1)
    else:
        month_end_exclusive = date(today.year, today.month + 1, 1)

    monthly_row = db.execute(
        select(
            func.coalesce(
                func.sum(Transaction.amount).filter(Transaction.type == "income"), 0
            ).label("monthly_income"),
            func.coalesce(
                func.sum(Transaction.amount).filter(Transaction.type == "expense"), 0
            ).label("monthly_expense"),
        ).where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date < month_end_exclusive,
        )
    ).one()

    monthly_income = Decimal(str(monthly_row.monthly_income))
    monthly_expense = Decimal(str(monthly_row.monthly_expense))

    remaining_balance = monthly_income - monthly_expense
    days_left = _days_until_next_payday(today, payday)
    # Clamp to zero: overspent months show Rp 0/day instead of a negative budget.
    raw_safe = (remaining_balance / days_left) if days_left > 0 else Decimal(0)
    safe_to_spend = raw_safe if raw_safe > 0 else Decimal(0)

    return {
        "transaction_dates": transaction_dates,
        "week_expense_total": week_expense_total,
        "week_top_category": week_top_category,
        "safe_to_spend": safe_to_spend,
        "days_left": days_left,
        "remaining_balance": remaining_balance,
        "payday": payday,
    }
