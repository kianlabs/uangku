"""Schemas for user preferences endpoint."""
from __future__ import annotations

from pydantic import BaseModel, Field


class UserPreferencesData(BaseModel):
    """Subset of user preferences stored in the ``users.preferences`` JSONB column.

    All fields are optional — PATCH semantics: only provided fields are merged.
    """

    payday: int | None = Field(None, ge=1, le=31, description="Day of month the user gets paid (1-31).")
    tx_sources: dict[str, str] | None = Field(
        None,
        description="Map of transaction_id → payment source label (e.g. 'Tunai', 'Bank', 'E-wallet').",
    )
    debt_tags: dict[str, dict] | None = Field(
        None,
        description="Map of transaction_id → debt tag object {tag: 'utang'|'piutang', settled: bool}.",
    )
    templates: list[dict] | None = Field(
        None,
        description="List of subscription / recurring templates.",
    )


class UserPreferencesRequest(BaseModel):
    preferences: UserPreferencesData


class UserPreferencesResponse(BaseModel):
    preferences: UserPreferencesData
