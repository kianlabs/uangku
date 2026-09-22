"""Helper validasi/serialisasi bersama antar schema."""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal


def today_utc() -> date:
    return datetime.now(UTC).date()


def validate_transaction_date(v: date | None) -> date | None:
    """Maks besok (toleransi gaji), tahun >= 2000."""
    if v is None:
        return v
    from datetime import timedelta

    if v > today_utc() + timedelta(days=1):
        raise ValueError("transaction_date cannot be in the future")
    if v.year < 2000:
        raise ValueError("transaction_date year must be >= 2000")
    return v


def serialize_money(v: Decimal) -> str:
    return f"{v:.2f}"
