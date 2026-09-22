from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer, field_validator

from app.schemas.category import CategoryType
from app.schemas.common import serialize_money, validate_transaction_date


class RecurringCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: Decimal
    type: CategoryType
    category_id: uuid.UUID
    day: int = Field(ge=1, le=31)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v


class RecurringUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    amount: Decimal | None = None
    type: CategoryType | None = None
    category_id: uuid.UUID | None = None
    day: int | None = Field(None, ge=1, le=31)
    active: bool | None = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("name must not be blank")
        return v.strip() if v is not None else v

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("amount must be greater than 0")
        return v


class RecurringConfirmRequest(BaseModel):
    transaction_date: date | None = None

    @field_validator("transaction_date")
    @classmethod
    def date_sane(cls, v: date | None) -> date | None:
        return validate_transaction_date(v)


class RecurringResponse(BaseModel):
    id: uuid.UUID
    name: str
    amount: Decimal
    type: CategoryType
    category_id: uuid.UUID
    category_name: str
    day: int
    active: bool
    last_confirmed: date | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("amount")
    def serialize_amount(self, v: Decimal) -> str:
        return serialize_money(v)


class RecurringListResponse(BaseModel):
    items: list[RecurringResponse]
