import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select

from app.core.config import settings
from app.models import Base
from app.models.category import Category
from app.models.transaction import Transaction
from app.services import demo as demo_module
from app.services.auth import register_user
from app.services.demo import seed_demo_data
from app.services.transaction import create_transaction


@pytest.fixture(scope="module")
def db():
    engine = create_engine(settings.database_url_test)
    Base.metadata.create_all(engine)
    from sqlalchemy.orm import Session

    with Session(engine) as s:
        yield s
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="module")
def user(db):
    return register_user(db, f"{uuid.uuid4()}@demo.com", "pass")


def test_seed_demo_data_creates_transactions_and_budgets(db, user):
    result = seed_demo_data(db, user, seed=42)
    assert result["transactions"] >= 10
    assert result["budgets"] == 2


def test_seed_rejects_user_that_already_has_transactions(db, user):
    # Test sebelumnya sudah mengisi data untuk user module-scoped ini.
    with pytest.raises(ValueError, match="already has transactions"):
        seed_demo_data(db, user, seed=42)


def test_seed_replaces_opening_balance_only_user(db):
    # Skenario onboarding: user isi saldo awal, lalu klik "Coba dengan contoh data".
    # Harus berhasil dalam 1x seed (tanpa 409 dulu).
    fresh = register_user(db, f"{uuid.uuid4()}@demo.com", "pass")
    income_cat = db.scalar(
        select(Category).where(
            Category.user_id == fresh.id, Category.type == "income"
        )
    )
    create_transaction(
        db,
        fresh,
        type_="income",
        amount=Decimal(500000),
        category_id=income_cat.id,
        transaction_date=datetime.now(UTC).date(),
        description="Saldo awal",
        is_opening_balance=True,
    )

    result = seed_demo_data(db, fresh, seed=42)

    assert result["transactions"] >= 10
    remaining_opening = db.scalars(
        select(Transaction).where(
            Transaction.user_id == fresh.id,
            Transaction.is_opening_balance.is_(True),
        )
    ).all()
    assert remaining_opening == []


def test_seed_demo_data_on_january_first_no_duplicate_salary(db, monkeypatch):
    """BUG-2: seed_demo_data di tanggal 1 Januari tidak boleh duplicate salary."""
    class FakeDatetime:
        @classmethod
        def now(cls, tz=None):
            return datetime(2028, 1, 1, tzinfo=UTC)

    monkeypatch.setattr(demo_module, "datetime", FakeDatetime)

    fresh = register_user(db, f"{uuid.uuid4()}@demo.com", "pass")
    seed_demo_data(db, fresh, seed=42)

    salaries = db.scalars(
        select(Transaction).where(
            Transaction.user_id == fresh.id,
            Transaction.type == "income",
            Transaction.description == "Gaji bulanan",
        )
    ).all()
    assert len(salaries) == 1
    assert salaries[0].transaction_date == date(2027, 12, 25)
