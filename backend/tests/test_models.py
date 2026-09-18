import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Base
from app.models import Category, Transaction, User


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(settings.database_url_test)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


@pytest.fixture
def session(engine):
    with Session(engine) as s:
        yield s
        s.rollback()


def make_user(session: Session) -> User:
    user = User(
        email=f"{uuid.uuid4()}@example.com",
        password_hash="hashed",
    )
    session.add(user)
    session.flush()
    return user


def make_category(session: Session, user: User, name: str, type_: str) -> Category:
    cat = Category(user_id=user.id, name=name, type=type_)
    session.add(cat)
    session.flush()
    return cat


def today() -> date:
    return datetime.now(tz=UTC).date()


# --- User ---

def test_user_uuid_pk(session):
    user = make_user(session)
    assert isinstance(user.id, uuid.UUID)


def test_user_email_unique(session):
    user = make_user(session)
    duplicate = User(email=user.email, password_hash="x")
    session.add(duplicate)
    with pytest.raises(IntegrityError):
        session.flush()


# --- Category ---

def test_category_uuid_pk(session):
    user = make_user(session)
    cat = make_category(session, user, "Makanan", "expense")
    assert isinstance(cat.id, uuid.UUID)


def test_category_unique_constraint(session):
    user = make_user(session)
    make_category(session, user, "Makanan", "expense")
    dup = Category(user_id=user.id, name="Makanan", type="expense")
    session.add(dup)
    with pytest.raises(IntegrityError):
        session.flush()


def test_category_same_name_different_type_allowed(session):
    user = make_user(session)
    make_category(session, user, "Lainnya", "expense")
    cat2 = Category(user_id=user.id, name="Lainnya", type="income")
    session.add(cat2)
    session.flush()
    assert cat2.id is not None


def test_category_belongs_to_user(session):
    user = make_user(session)
    cat = make_category(session, user, "Transportasi", "expense")
    assert cat.user_id == user.id


# --- Transaction ---

def test_transaction_uuid_pk(session):
    user = make_user(session)
    cat = make_category(session, user, "Gaji", "income")
    tx = Transaction(
        user_id=user.id,
        category_id=cat.id,
        type="income",
        amount=Decimal("5000000.00"),
        transaction_date=today(),
    )
    session.add(tx)
    session.flush()
    assert isinstance(tx.id, uuid.UUID)


def test_transaction_amount_is_decimal(session):
    user = make_user(session)
    cat = make_category(session, user, "Belanja", "expense")
    tx = Transaction(
        user_id=user.id,
        category_id=cat.id,
        type="expense",
        amount=Decimal("25000.50"),
        transaction_date=today(),
    )
    session.add(tx)
    session.flush()
    assert isinstance(tx.amount, Decimal)


def test_transaction_description_optional(session):
    user = make_user(session)
    cat = make_category(session, user, "Hiburan", "expense")
    tx = Transaction(
        user_id=user.id,
        category_id=cat.id,
        type="expense",
        amount=Decimal(10000),
        transaction_date=today(),
        description=None,
    )
    session.add(tx)
    session.flush()
    assert tx.description is None


def test_transaction_references_user_and_category(session):
    user = make_user(session)
    cat = make_category(session, user, "Freelance", "income")
    tx = Transaction(
        user_id=user.id,
        category_id=cat.id,
        type="income",
        amount=Decimal(1000000),
        transaction_date=date(2026, 9, 17),
    )
    session.add(tx)
    session.flush()
    assert tx.user_id == user.id
    assert tx.category_id == cat.id
