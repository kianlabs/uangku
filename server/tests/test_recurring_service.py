import uuid
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import (
    AlreadyConfirmedError,
    NotFoundError,
    RecurringInactiveError,
    TypeMismatchError,
)
from app.models import (  # noqa: F401
    Base,
    Category,
    RecurringTemplate,
    Transaction,
    User,
)
from app.services.auth import register_user
from app.services.category import create_category
from app.services.recurring import (
    confirm_recurring,
    create_recurring,
    delete_recurring,
    list_recurring,
    update_recurring,
)


@pytest.fixture(scope="module")
def db():
    engine = create_engine(settings.database_url_test)
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="module")
def user(db):
    return register_user(db, f"{uuid.uuid4()}@rec.com", "pass")


@pytest.fixture(scope="module")
def expense_cat(db, user):
    return create_category(db, user, name="RecFood", type_="expense")


@pytest.fixture(scope="module")
def income_cat(db, user):
    return create_category(db, user, name="RecSalary", type_="income")


def _make(db, user, cat, **kw):
    params = {
        "name": "Kos",
        "amount": Decimal(1000000),
        "type_": "expense",
        "category_id": cat.id,
        "day": 5,
    }
    params.update(kw)
    return create_recurring(db, user, **params)


def test_create_and_list(db, user, expense_cat):
    rec = _make(db, user, expense_cat)
    assert rec.id is not None
    assert rec.active is True
    assert rec.last_confirmed is None
    items = list_recurring(db, user)
    assert any(r.id == rec.id for r in items)


def test_create_type_mismatch_raises(db, user, income_cat):
    with pytest.raises(TypeMismatchError):
        _make(db, user, income_cat, type_="expense")


def test_create_income_ok(db, user, income_cat):
    rec = _make(db, user, income_cat, name="Gaji", type_="income")
    assert rec.type == "income"


def test_update_fields(db, user, expense_cat):
    rec = _make(db, user, expense_cat, name="Old")
    updated = update_recurring(db, user, rec.id, name="New", day=10, active=False)
    assert updated.name == "New"
    assert updated.day == 10
    assert updated.active is False


def test_update_not_owned_raises(db, expense_cat):
    other = register_user(db, f"{uuid.uuid4()}@rec-other.com", "pass")
    rec = _make(db, other, create_category(db, other, name="OC", type_="expense"))
    with pytest.raises(NotFoundError):
        update_recurring(db, other, uuid.uuid4(), name="x")
    with pytest.raises(NotFoundError):
        delete_recurring(db, other, uuid.uuid4())
    assert rec.id is not None


def test_delete(db, user, expense_cat):
    rec = _make(db, user, expense_cat, name="Del")
    delete_recurring(db, user, rec.id)
    assert db.get(RecurringTemplate, rec.id) is None


def test_confirm_creates_transaction(db, user, expense_cat):
    rec = _make(db, user, expense_cat, name="Listrik", day=1)
    tx = confirm_recurring(db, user, rec.id, transaction_date=date(2026, 9, 5))
    assert tx.description == "Listrik"
    assert tx.type == "expense"
    assert tx.transaction_date == date(2026, 9, 5)
    db.refresh(rec)
    assert rec.last_confirmed == date(2026, 9, 5)
    stored = db.scalar(select(Transaction).where(Transaction.id == tx.id))
    assert stored is not None


def test_confirm_twice_same_month_raises(db, user, expense_cat):
    rec = _make(db, user, expense_cat, name="Air", day=1)
    confirm_recurring(db, user, rec.id, transaction_date=date(2026, 8, 5))
    with pytest.raises(AlreadyConfirmedError):
        confirm_recurring(db, user, rec.id, transaction_date=date(2026, 8, 20))


def test_confirm_inactive_raises(db, user, expense_cat):
    rec = _make(db, user, expense_cat, name="Paused")
    update_recurring(db, user, rec.id, active=False)
    with pytest.raises(RecurringInactiveError):
        confirm_recurring(db, user, rec.id, transaction_date=date(2026, 9, 5))
