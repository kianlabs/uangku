"""Test handler 500/503 global (Batch 1 P0-4)."""

from unittest import mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.v1 import transactions as transactions_api
from app.core import deps
from app.core.config import settings
from app.main import app
from app.models import Base, Category, Transaction, User  # noqa: F401


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    engine = create_engine(settings.database_url_test)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="module")
def test_engine(setup_db):
    return create_engine(settings.database_url_test)


@pytest.fixture(scope="module")
def client(test_engine):
    def override_get_db():
        db = Session(test_engine)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[deps.get_db] = override_get_db
    # raise_server_exceptions=False agar envelope 500/503 bisa diassert.
    with TestClient(app, raise_server_exceptions=False) as c:
        c.post("/api/v1/auth/register", json={"email": "err_user@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "err_user@test.com", "password": "pass1234"})
        yield c
    app.dependency_overrides.clear()


def test_unhandled_error_returns_500_envelope(client):
    with mock.patch.object(
        transactions_api, "list_transactions", side_effect=RuntimeError("boom-secret")
    ):
        r = client.get("/api/v1/transactions")
    assert r.status_code == 500
    body = r.json()
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert body["error"]["message"] == "Terjadi kesalahan server."
    assert "boom-secret" not in r.text


def test_db_error_returns_503_envelope(client):
    db_err = OperationalError("SELECT 1", {}, Exception("connection down"))
    with mock.patch.object(
        transactions_api, "list_transactions", side_effect=db_err
    ):
        r = client.get("/api/v1/transactions")
    assert r.status_code == 503
    body = r.json()
    assert body["error"]["code"] == "SERVICE_UNAVAILABLE"
