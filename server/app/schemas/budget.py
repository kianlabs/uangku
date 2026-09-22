from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer

from app.schemas.category import CategoryType
from app.schemas.common import serialize_money


class BudgetUpsertRequest(BaseModel):
    amount: Decimal = Field(gt=0, description="Batas belanja bulanan, harus > 0.")


class BudgetResponse(BaseModel):
    category_id: uuid.UUID
    category_name: str
    type: CategoryType
    amount: Decimal
    spent: Decimal | None = None
    percentage: float | None = None

    @field_serializer("amount", "spent", when_used="unless-none")
    def serialize_money(self, v: Decimal) -> str:
        return serialize_money(v)


class BudgetListResponse(BaseModel):
    items: list[BudgetResponse]
    month: str | None = None
    # created_at anggaran tertua — klien memakai ini sebagai batas bawah
    # navigasi bulan (bulan sebelum anggaran pertama tak relevan).
    earliest_created_at: datetime | None = None
