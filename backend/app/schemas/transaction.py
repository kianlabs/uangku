from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer, field_validator

from app.schemas.category import CategoryType


class TransactionCreateRequest(BaseModel):
    type: CategoryType
    amount: Decimal
    category_id: uuid.UUID
    description: str | None = Field(None, max_length=500)
    transaction_date: date

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v


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
