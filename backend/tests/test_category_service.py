import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Base
from app.models import Category, Transaction, User  # noqa: F401
from app.services.auth import register_user
from app.services.category import (
    create_category,
    delete_category,
    list_categories,
    update_category,
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
    return register_user(db, f"{uuid.uuid4()}@svc.com", "pass")


@pytest.fixture(scope="module")
def other_user(db):
    return register_user(db, f"{uuid.uuid4()}@svc.com", "pass")


def test_create_category(db, user):
    cat = create_category(db, user, name="Food", type_="expense")
    assert cat.id is not None
    assert cat.user_id == user.id
    assert cat.name == "Food"
    assert cat.type == "expense"


def test_create_duplicate_raises(db, user):
    create_category(db, user, name="Dupcat", type_="expense")
    with pytest.raises(ValueError, match="duplicate_category"):
        create_category(db, user, name="Dupcat", type_="expense")


def test_create_same_name_different_type_allowed(db, user):
    create_category(db, user, name="Both", type_="expense")
    cat2 = create_category(db, user, name="Both", type_="income")
    assert cat2.id is not None


def test_list_categories_own_only(db, user, other_user):
    create_category(db, user, name="Mine", type_="income")
    create_category(db, other_user, name="Theirs", type_="income")
    cats = list_categories(db, user)
    assert all(c.user_id == user.id for c in cats)


def test_list_categories_filter_by_type(db, user):
    cats = list_categories(db, user, type_filter="expense")
    assert all(c.type == "expense" for c in cats)


def test_update_category(db, user):
    cat = create_category(db, user, name="OldName", type_="expense")
    updated = update_category(db, user, cat.id, name="NewName")
    assert updated.name == "NewName"


def test_update_category_not_owned_raises(db, user, other_user):
    cat = create_category(db, other_user, name="NotMine", type_="expense")
    with pytest.raises(ValueError, match="not_found"):
        update_category(db, user, cat.id, name="Hacked")


def test_delete_category(db, user):
    cat = create_category(db, user, name="ToDelete", type_="expense")
    delete_category(db, user, cat.id)
    assert db.get(Category, cat.id) is None


def test_delete_category_not_owned_raises(db, user, other_user):
    cat = create_category(db, other_user, name="OtherDel", type_="expense")
    with pytest.raises(ValueError, match="not_found"):
        delete_category(db, user, cat.id)


def test_delete_category_in_use_raises(db, user):
    from datetime import date
    from decimal import Decimal

    from app.models.transaction import Transaction as TxModel

    cat = create_category(db, user, name="InUse", type_="expense")
    tx = TxModel(
        user_id=user.id,
        category_id=cat.id,
        type="expense",
        amount=Decimal(1000),
        transaction_date=date(2026, 9, 17),
    )
    db.add(tx)
    db.commit()
    with pytest.raises(ValueError, match="category_in_use"):
        delete_category(db, user, cat.id)
