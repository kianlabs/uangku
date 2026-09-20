"""Tests for /api/v1/budgets (anggaran per kategori)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core import deps
from app.core.config import settings
from app.main import app
from app.models import Base, Budget, Category, Transaction, User  # noqa: F401


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
    with TestClient(app, raise_server_exceptions=True) as c:
        c.post("/api/v1/auth/register", json={"email": "budget_user@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "budget_user@test.com", "password": "pass1234"})
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def other_client(test_engine):
    def override_get_db():
        db = Session(test_engine)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[deps.get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        c.post("/api/v1/auth/register", json={"email": "budget_other@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "budget_other@test.com", "password": "pass1234"})
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def expense_cat_id(client):
    r = client.get("/api/v1/categories?type=expense")
    return r.json()["items"][0]["id"]


@pytest.fixture(scope="module")
def other_expense_cat_id(other_client):
    r = other_client.get("/api/v1/categories?type=expense")
    return r.json()["items"][0]["id"]


# --- auth ---

def test_budgets_requires_auth():
    with TestClient(app) as c:
        r = c.get("/api/v1/budgets")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


# --- upsert ---

def test_upsert_creates_budget(client, expense_cat_id):
    r = client.put(f"/api/v1/budgets/{expense_cat_id}", json={"amount": "500000"})
    assert r.status_code == 200
    body = r.json()
    assert body["category_id"] == expense_cat_id
    assert body["amount"] == "500000.00"
    assert body["spent"] is None


def test_upsert_updates_existing(client, expense_cat_id):
    client.put(f"/api/v1/budgets/{expense_cat_id}", json={"amount": "500000"})
    r = client.put(f"/api/v1/budgets/{expense_cat_id}", json={"amount": "750000"})
    assert r.status_code == 200
    assert r.json()["amount"] == "750000.00"


def test_upsert_rejects_zero_and_negative(client, expense_cat_id):
    for amount in ["0", "-100"]:
        r = client.put(f"/api/v1/budgets/{expense_cat_id}", json={"amount": amount})
        assert r.status_code == 422


def test_upsert_other_users_category_rejected(client, other_expense_cat_id):
    r = client.put(f"/api/v1/budgets/{other_expense_cat_id}", json={"amount": "100000"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "INVALID_CATEGORY"


def test_upsert_unknown_category_rejected(client):
    r = client.put("/api/v1/budgets/00000000-0000-0000-0000-000000000000", json={"amount": "100000"})
    assert r.status_code == 422


# --- list + spent ---

def test_list_budgets_empty_for_new_user(other_client):
    r = other_client.get("/api/v1/budgets")
    assert r.status_code == 200
    assert r.json()["items"] == []


def test_list_budgets_with_month_spent(client, expense_cat_id):
    client.put(f"/api/v1/budgets/{expense_cat_id}", json={"amount": "1000000"})
    client.post("/api/v1/transactions", json={
        "type": "expense",
        "amount": "250000",
        "category_id": expense_cat_id,
        "transaction_date": "2026-09-10",
    })
    r = client.get("/api/v1/budgets?month=2026-09")
    assert r.status_code == 200
    body = r.json()
    assert body["month"] == "2026-09"
    item = next(i for i in body["items"] if i["category_id"] == expense_cat_id)
    assert item["spent"] == "250000.00"
    assert item["percentage"] == 25.0


def test_list_budgets_invalid_month(client):
    r = client.get("/api/v1/budgets?month=2026-13")
    assert r.status_code == 422


def test_budgets_isolated_between_users(client, other_client, expense_cat_id, other_expense_cat_id):
    other_client.put(f"/api/v1/budgets/{other_expense_cat_id}", json={"amount": "999999"})
    r = client.get("/api/v1/budgets")
    ids = [i["category_id"] for i in r.json()["items"]]
    assert other_expense_cat_id not in ids
    assert expense_cat_id in ids


# --- delete ---

def test_delete_budget(client, expense_cat_id):
    client.put(f"/api/v1/budgets/{expense_cat_id}", json={"amount": "100000"})
    r = client.delete(f"/api/v1/budgets/{expense_cat_id}")
    assert r.status_code == 204
    # idempotent: hapus lagi tetap 204
    r2 = client.delete(f"/api/v1/budgets/{expense_cat_id}")
    assert r2.status_code == 204
    r3 = client.get("/api/v1/budgets")
    assert all(i["category_id"] != expense_cat_id for i in r3.json()["items"])
