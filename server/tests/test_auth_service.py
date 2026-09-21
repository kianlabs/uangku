import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Base, Category, User  # noqa: F401
from app.services.auth import authenticate_user, register_user


@pytest.fixture(scope="module")
def db():
    engine = create_engine(settings.database_url_test)
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s
    Base.metadata.drop_all(engine)


def test_register_creates_user(db):
    user = register_user(db, "test@example.com", "password123")
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.password_hash != "password123"


def test_register_creates_default_categories(db):
    user = register_user(db, "cat@example.com", "password123")
    cats = db.query(Category).filter(Category.user_id == user.id).all()
    assert len(cats) == 13  # 8 expense + 5 income


def test_register_normalizes_email(db):
    user = register_user(db, "  UPPER@EXAMPLE.COM  ", "x")
    assert user.email == "upper@example.com"


def test_register_duplicate_email_raises(db):
    register_user(db, "dup@example.com", "x")
    with pytest.raises(ValueError, match="email_taken"):
        register_user(db, "dup@example.com", "y")


def test_authenticate_valid(db):
    register_user(db, "login@example.com", "correctpass")
    user = authenticate_user(db, "login@example.com", "correctpass")
    assert user.email == "login@example.com"


def test_authenticate_wrong_password(db):
    register_user(db, "wrong@example.com", "correctpass")
    with pytest.raises(ValueError, match="invalid_credentials"):
        authenticate_user(db, "wrong@example.com", "wrongpass")


def test_authenticate_unknown_email(db):
    with pytest.raises(ValueError, match="invalid_credentials"):
        authenticate_user(db, "nobody@example.com", "x")
