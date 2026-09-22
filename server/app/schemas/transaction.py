from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer, field_validator

from app.schemas.category import CategoryType


def _today() -> date:
    return datetime.now(UTC).date()


def _validate_transaction_date(v: date | None) -> date | None:
    """Tolak tanggal absurd: masa depan (> besok, toleransi untuk gaji
    yang dicatat duluan) dan tahun < 2000."""
    if v is None:
        return v
    if v > _today() + timedelta(days=1):
        raise ValueError("transaction_date cannot be in the future")
    if v.year < 2000:
        raise ValueError("transaction_date year must be >= 2000")
    return v


class TransactionCreateRequest(BaseModel):
    type: CategoryType
    amount: Decimal
    category_id: uuid.UUID
    description: str | None = Field(None, max_length=500)
    transaction_date: date
    # Saldo awal hanya boleh untuk income; divalidasi di service layer.
    is_opening_balance: bool = False

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("transaction_date")
    @classmethod
    def date_sane(cls, v: date) -> date:
        result = _validate_transaction_date(v)
        assert result is not None
        return result


class TransactionUpdateRequest(BaseModel):
    type: CategoryType | None = None
    amount: Decimal | None = None
    category_id: uuid.UUID | None = None
    description: str | None = Field(None, max_length=500)
    transaction_date: date | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("transaction_date")
    @classmethod
    def date_sane(cls, v: date | None) -> date | None:
        return _validate_transaction_date(v)


def _serialize_money(v: Decimal) -> str:
    return f"{v:.2f}"


class TransactionCategoryEmbed(BaseModel):
    id: uuid.UUID
    name: str
    type: CategoryType

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: uuid.UUID
    type: CategoryType
    amount: Decimal
    description: str | None
    transaction_date: date
    is_opening_balance: bool = False
    category: TransactionCategoryEmbed
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("amount")
    def serialize_amount(self, v: Decimal) -> str:
        return _serialize_money(v)


class TransactionDetailResponse(BaseModel):
    id: uuid.UUID
    type: CategoryType
    amount: Decimal
    description: str | None
    transaction_date: date
    is_opening_balance: bool = False
    category: TransactionCategoryEmbed

    model_config = {"from_attributes": True}

    @field_serializer("amount")
    def serialize_amount(self, v: Decimal) -> str:
        return _serialize_money(v)


class TransactionUpdatedResponse(BaseModel):
    id: uuid.UUID
    type: CategoryType
    amount: Decimal
    description: str | None
    transaction_date: date
    is_opening_balance: bool = False
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("amount")
    def serialize_amount(self, v: Decimal) -> str:
        return _serialize_money(v)


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    pagination: PaginationMeta
