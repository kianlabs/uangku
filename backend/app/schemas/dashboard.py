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
