import uuid

import pytest
from sqlalchemy import create_engine

from app.core.config import settings
from app.models import Base
from app.services.auth import register_user
from app.services.demo import seed_demo_data


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
