import uuid
from datetime import date
from decimal import Decimal
from unittest import mock

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ExportTooLargeError, InvalidCategoryError, TypeMismatchError
from app.models import Base, Category, Transaction, User  # noqa: F401
from app.services.auth import register_user
from app.services.category import create_category
from app.services.transaction import (
    create_transaction,
    delete_transaction,
    get_transaction,
    get_transactions_for_export,
    list_transactions,
    update_transaction,
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
    return register_user(db, f"{uuid.uuid4()}@tx.com", "pass")


@pytest.fixture(scope="module")
def other_user(db):
    return register_user(db, f"{uuid.uuid4()}@tx.com", "pass")


@pytest.fixture(scope="module")
def expense_cat(db, user):
    return create_category(db, user, name="Food", type_="expense")


@pytest.fixture(scope="module")
def income_cat(db, user):
    return create_category(db, user, name="Salary", type_="income")


@pytest.fixture(scope="module")
def other_expense_cat(db, other_user):
    return create_category(db, other_user, name="OtherFood", type_="expense")


def test_create_transaction(db, user, expense_cat):
    tx = create_transaction(
        db, user,
        type_="expense",
        amount=Decimal("25000.00"),
        category_id=expense_cat.id,
        transaction_date=date(2026, 9, 17),
    )
    assert tx.id is not None
    assert tx.user_id == user.id
    assert tx.amount == Decimal("25000.00")
    assert tx.type == "expense"


def test_create_amount_zero_raises(db, user, expense_cat):
    with pytest.raises(ValueError, match="amount"):
        create_transaction(
            db, user,
            type_="expense",
            amount=Decimal(0),
            category_id=expense_cat.id,
            transaction_date=date(2026, 9, 17),
        )


def test_create_amount_negative_raises(db, user, expense_cat):
    with pytest.raises(ValueError, match="amount"):
        create_transaction(
            db, user,
            type_="expense",
            amount=Decimal(-1),
            category_id=expense_cat.id,
            transaction_date=date(2026, 9, 17),
        )


def test_create_category_not_owned_raises(db, user, other_expense_cat):
    with pytest.raises(ValueError, match="invalid_category"):
        create_transaction(
            db, user,
            type_="expense",
            amount=Decimal(1000),
            category_id=other_expense_cat.id,
            transaction_date=date(2026, 9, 17),
        )


def test_create_type_mismatch_raises(db, user, income_cat):
    with pytest.raises(ValueError, match="type_mismatch"):
        create_transaction(
            db, user,
            type_="expense",
            amount=Decimal(1000),
            category_id=income_cat.id,
            transaction_date=date(2026, 9, 17),
        )


def test_get_transaction(db, user, expense_cat):
    tx = create_transaction(
        db, user,
        type_="expense",
        amount=Decimal(5000),
        category_id=expense_cat.id,
        transaction_date=date(2026, 9, 17),
    )
    fetched = get_transaction(db, user, tx.id)
    assert fetched.id == tx.id


def test_get_transaction_not_owned_raises(db, user, other_user, other_expense_cat):
    tx = create_transaction(
        db, other_user,
        type_="expense",
        amount=Decimal(500),
        category_id=other_expense_cat.id,
        transaction_date=date(2026, 9, 17),
    )
    with pytest.raises(ValueError, match="not_found"):
        get_transaction(db, user, tx.id)


def test_list_transactions_own_only(db, user):
    txs = list_transactions(db, user)
    assert all(t.user_id == user.id for t in txs["items"])


def test_list_transactions_filter_type(db, user):
    result = list_transactions(db, user, type_filter="expense")
    assert all(t.type == "expense" for t in result["items"])


def test_list_transactions_filter_category(db, user, expense_cat):
    result = list_transactions(db, user, category_id=expense_cat.id)
    assert all(t.category_id == expense_cat.id for t in result["items"])


def test_list_transactions_filter_dates(db, user):
    result = list_transactions(
        db, user,
        date_from=date(2026, 9, 17),
        date_to=date(2026, 9, 17),
    )
    assert all(t.transaction_date == date(2026, 9, 17) for t in result["items"])


def test_list_transactions_pagination(db, user):
    result = list_transactions(db, user, page=1, page_size=2)
    assert len(result["items"]) <= 2
    assert "total_items" in result
    assert "total_pages" in result


def test_list_transactions_sort_order(db, user, expense_cat, income_cat):
    create_transaction(db, user, type_="expense", amount=Decimal(100),
                       category_id=expense_cat.id, transaction_date=date(2026, 9, 15))
    create_transaction(db, user, type_="income", amount=Decimal(200),
                       category_id=income_cat.id, transaction_date=date(2026, 9, 18))
    txs = list_transactions(db, user)["items"]
    dates = [t.transaction_date for t in txs]
    assert dates == sorted(dates, reverse=True)


def test_update_transaction_amount(db, user, expense_cat):
    tx = create_transaction(db, user, type_="expense", amount=Decimal(1000),
                            category_id=expense_cat.id, transaction_date=date(2026, 9, 17))
    updated = update_transaction(db, user, tx.id, amount=Decimal(2000))
    assert updated.amount == Decimal(2000)


def test_update_type_and_category_compatible(db, user, income_cat):
    from app.services.category import create_category as cc
    expense_cat2 = cc(db, user, name="Transport2", type_="expense")
    tx = create_transaction(db, user, type_="expense", amount=Decimal(1000),
                            category_id=expense_cat2.id, transaction_date=date(2026, 9, 17))
    updated = update_transaction(db, user, tx.id, type_="income", category_id=income_cat.id)
    assert updated.type == "income"
    assert updated.category_id == income_cat.id


def test_update_type_only_mismatch_raises(db, user, expense_cat):
    tx = create_transaction(db, user, type_="expense", amount=Decimal(1000),
                            category_id=expense_cat.id, transaction_date=date(2026, 9, 17))
    with pytest.raises(ValueError, match="type_mismatch"):
        update_transaction(db, user, tx.id, type_="income")


def test_update_category_only_mismatch_raises(db, user, expense_cat, income_cat):
    tx = create_transaction(db, user, type_="expense", amount=Decimal(1000),
                            category_id=expense_cat.id, transaction_date=date(2026, 9, 17))
    with pytest.raises(ValueError, match="type_mismatch"):
        update_transaction(db, user, tx.id, category_id=income_cat.id)


def test_update_description_clear(db, user, expense_cat):
    tx = create_transaction(db, user, type_="expense", amount=Decimal(500),
                            category_id=expense_cat.id, transaction_date=date(2026, 9, 17),
                            description="old desc")
    updated = update_transaction(db, user, tx.id, clear_description=True)
    assert updated.description is None


def test_update_description_set(db, user, expense_cat):
    tx = create_transaction(db, user, type_="expense", amount=Decimal(500),
                            category_id=expense_cat.id, transaction_date=date(2026, 9, 17))
    updated = update_transaction(db, user, tx.id, description="new desc")
    assert updated.description == "new desc"


def test_update_transaction_not_owned_raises(db, user, other_user, other_expense_cat):
    tx = create_transaction(db, other_user, type_="expense", amount=Decimal(500),
                            category_id=other_expense_cat.id, transaction_date=date(2026, 9, 17))
    with pytest.raises(ValueError, match="not_found"):
        update_transaction(db, user, tx.id, amount=Decimal(999))


def test_delete_transaction(db, user, expense_cat):
    tx = create_transaction(db, user, type_="expense", amount=Decimal(100),
                            category_id=expense_cat.id, transaction_date=date(2026, 9, 17))
    delete_transaction(db, user, tx.id)
    with pytest.raises(ValueError, match="not_found"):
        get_transaction(db, user, tx.id)


def test_delete_transaction_not_owned_raises(db, user, other_user, other_expense_cat):
    tx = create_transaction(db, other_user, type_="expense", amount=Decimal(100),
                            category_id=other_expense_cat.id, transaction_date=date(2026, 9, 17))
    with pytest.raises(ValueError, match="not_found"):
        delete_transaction(db, user, tx.id)


def test_create_opening_balance_must_be_income(db, user, expense_cat):
    with pytest.raises(TypeMismatchError):
        create_transaction(db, user, type_="expense", amount=Decimal(1000),
                           category_id=expense_cat.id, transaction_date=date(2026, 3, 1),
                           is_opening_balance=True)


def test_export_limit_enforced(db):
    """Export menolak saat baris melebihi limit."""
    fresh = register_user(db, f"{uuid.uuid4()}@export.com", "pass")
    cat = db.scalar(
        select(Category).where(
            Category.user_id == fresh.id, Category.type == "expense"
        )
    )
    for _ in range(3):
        create_transaction(db, fresh, type_="expense", amount=Decimal(1000),
                           category_id=cat.id, transaction_date=date(2026, 9, 17))
    with pytest.raises(ExportTooLargeError):
        get_transactions_for_export(db, fresh, limit=2)
    assert len(get_transactions_for_export(db, fresh, limit=10)) == 3


def _integrity_error():
    return IntegrityError("INSERT INTO transactions", {}, Exception("fk violation"))


def test_create_race_category_deleted_returns_422(db, user, expense_cat):
    """Kategori hilang antara validasi dan commit -> InvalidCategoryError (422)."""
    with mock.patch.object(db, "commit", side_effect=_integrity_error()), \
            pytest.raises(InvalidCategoryError):
        create_transaction(
            db, user,
            type_="expense",
            amount=Decimal(1000),
            category_id=expense_cat.id,
            transaction_date=date(2026, 9, 17),
        )
    db.rollback()


def test_update_race_category_deleted_returns_422(db, user, expense_cat):
    tx = create_transaction(
        db, user,
        type_="expense",
        amount=Decimal(1000),
        category_id=expense_cat.id,
        transaction_date=date(2026, 9, 17),
    )
    with mock.patch.object(db, "commit", side_effect=_integrity_error()), \
            pytest.raises(InvalidCategoryError):
        update_transaction(db, user, tx.id, amount=Decimal(2000))
    db.rollback()
