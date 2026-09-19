from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, field_serializer

from app.schemas.category import CategoryType


def _fmt(v: Decimal) -> str:
    return f"{v:.2f}"


class ExpenseByCategoryItem(BaseModel):
    category_id: uuid.UUID
    category_name: str
    amount: Decimal
    percentage: float

    @field_serializer("amount")
    def serialize_amount(self, v: Decimal) -> str:
        return _fmt(v)


class RecentTransactionItem(BaseModel):
    id: uuid.UUID
    type: CategoryType
    amount: Decimal
    description: str | None
    transaction_date: date
    category_name: str

    @field_serializer("amount")
    def serialize_amount(self, v: Decimal) -> str:
        return _fmt(v)


class DashboardSummaryResponse(BaseModel):
    period: str
    balance: Decimal
    monthly_income: Decimal
    monthly_expense: Decimal
    transaction_count: int
    expense_by_category: list[ExpenseByCategoryItem]
    recent_transactions: list[RecentTransactionItem]

    @field_serializer("balance", "monthly_income", "monthly_expense")
    def serialize_money(self, v: Decimal) -> str:
        return _fmt(v)


class DashboardMetricsResponse(BaseModel):
    """Response schema untuk GET /api/v1/dashboard/metrics."""

    transaction_dates: list[str]   # "YYYY-MM-DD" strings untuk kalkulasi streak
    week_expense_total: Decimal
    week_top_category: str | None
    safe_to_spend: Decimal
    days_left: int
    remaining_balance: Decimal
    payday: int

    @field_serializer("week_expense_total", "safe_to_spend", "remaining_balance")
    def serialize_money(self, v: Decimal) -> str:
        return _fmt(v)
