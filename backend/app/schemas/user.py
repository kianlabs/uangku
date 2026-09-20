"""Schemas for user preferences endpoint."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DebtTag(BaseModel):
    tag: Literal["utang", "piutang"]
    settled: bool = False

    model_config = {"extra": "forbid"}


class UserPreferencesData(BaseModel):
    """Subset of user preferences stored in the ``users.preferences`` JSONB column.

    All fields are optional — PATCH semantics: only provided fields are merged.
    Limits guard against unbounded JSONB bloat (DoS via MBs of preferences).
    """

    payday: int | None = Field(None, ge=1, le=31, description="Day of month the user gets paid (1-31).")
    tx_sources: dict[str, str] | None = Field(
        None,
        max_length=500,
        description="Map of transaction_id → payment source label (e.g. 'Tunai', 'Bank', 'E-wallet').",
    )
    debt_tags: dict[str, DebtTag] | None = Field(
        None,
        max_length=500,
        description="Map of transaction_id → debt tag object {tag: 'utang'|'piutang', settled: bool}.",
    )
    templates: list[dict[str, str | int | float | bool | None]] | None = Field(
        None,
        max_length=100,
        description="List of subscription / recurring templates.",
    )

    @field_validator("tx_sources")
    @classmethod
    def _limit_source_labels(cls, v: dict[str, str] | None) -> dict[str, str] | None:
        if v is None:
            return v
        for key, val in v.items():
            if len(key) > 100 or len(val) > 100:
                raise ValueError("tx_sources keys/values must be at most 100 characters")
        return v

    @field_validator("templates")
    @classmethod
    def _limit_templates(
        cls, v: list[dict[str, str | int | float | bool | None]] | None
    ) -> list[dict[str, str | int | float | bool | None]] | None:
        if v is None:
            return v
        for item in v:
            if len(item) > 20:
                raise ValueError("template objects must have at most 20 keys")
            for key, val in item.items():
                if len(key) > 100:
                    raise ValueError("template keys must be at most 100 characters")
                if isinstance(val, str) and len(val) > 200:
                    raise ValueError("template string values must be at most 200 characters")
        return v


class UserPreferencesRequest(BaseModel):
    preferences: UserPreferencesData


class UserPreferencesResponse(BaseModel):
    preferences: UserPreferencesData
