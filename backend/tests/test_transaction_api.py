import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core import deps
from app.core.config import settings
from app.models import Base
from app.main import app
from app.models import Category, Transaction, User  # noqa: F401


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
        c.post("/api/v1/auth/register", json={"email": "tx_user@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "tx_user@test.com", "password": "pass1234"})
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
        c.post("/api/v1/auth/register", json={"email": "tx_other@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "tx_other@test.com", "password": "pass1234"})
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def expense_cat_id(client):
    r = client.get("/api/v1/categories?type=expense")
    return r.json()["items"][0]["id"]


@pytest.fixture(scope="module")
def income_cat_id(client):
    r = client.get("/api/v1/categories?type=income")
    return r.json()["items"][0]["id"]


@pytest.fixture(scope="module")
def other_expense_cat_id(other_client):
    r = other_client.get("/api/v1/categories?type=expense")
    return r.json()["items"][0]["id"]


# --- list ---

def test_list_requires_auth():
    with TestClient(app) as c:
        r = c.get("/api/v1/transactions")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


def test_list_returns_empty_initially(client):
    r = client.get("/api/v1/transactions")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "pagination" in body
    p = body["pagination"]
    assert p["page"] == 1
    assert p["page_size"] == 20
    assert "total_items" in p
    assert "total_pages" in p


def test_list_invalid_type_422(client):
    r = client.get("/api/v1/transactions?type=bad")
    assert r.status_code == 422


def test_list_pagination_defaults(client, expense_cat_id):
    for _ in range(3):
        client.post("/api/v1/transactions", json={
            "type": "expense", "amount": "1000.00",
            "category_id": expense_cat_id,
            "transaction_date": "2026-09-17",
        })
    r = client.get("/api/v1/transactions?page=1&page_size=2")
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) <= 2
    assert body["pagination"]["page_size"] == 2


# --- create ---

def test_create_201(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense",
        "amount": "25000.50",
        "category_id": expense_cat_id,
        "description": "Makan siang",
        "transaction_date": "2026-09-17",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["type"] == "expense"
    assert body["amount"] == "25000.50"  # API contract: 2dp decimal string
    assert body["description"] == "Makan siang"
    assert body["transaction_date"] == "2026-09-17"
    assert "id" in body
    assert "created_at" in body
    assert "category" in body
    assert body["category"]["type"] == "expense"


def test_create_amount_is_string_decimal(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "99999.99",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 201
    assert isinstance(r.json()["amount"], str)


def test_create_amount_zero_422(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "0",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 422


def test_create_amount_negative_422(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "-1",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 422


def test_create_invalid_type_422(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "bad", "amount": "1000",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 422


def test_create_wrong_category_owner_422(client, other_expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1000",
        "category_id": other_expense_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "INVALID_CATEGORY"


def test_create_type_mismatch_422(client, income_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1000",
        "category_id": income_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "TYPE_MISMATCH"


# --- get ---

def test_get_transaction_200(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "5000.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.get(f"/api/v1/transactions/{tx_id}")
    assert r2.status_code == 200
    body = r2.json()
    assert body["id"] == tx_id
    assert "category" in body
    assert isinstance(body["amount"], str)


def test_get_transaction_404_other_user(client, other_client, expense_cat_id, other_expense_cat_id):
    r = other_client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "500",
        "category_id": other_expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.get(f"/api/v1/transactions/{tx_id}")
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "NOT_FOUND"


def test_get_transaction_404_nonexistent(client):
    r = client.get(f"/api/v1/transactions/{uuid.uuid4()}")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


# --- patch ---

def test_patch_amount(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1000.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"amount": "2000.00"})
    assert r2.status_code == 200
    body = r2.json()
    assert body["amount"] == "2000.00"
    assert "updated_at" in body
    assert isinstance(body["amount"], str)


def test_patch_description_set(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "500.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"description": "new desc"})
    assert r2.status_code == 200
    assert r2.json()["description"] == "new desc"


def test_patch_description_clear(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "500.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
        "description": "to be cleared",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"description": None})
    assert r2.status_code == 200
    assert r2.json()["description"] is None


def test_patch_description_unset_unchanged(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "500.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
        "description": "keep me",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"amount": "600.00"})
    assert r2.status_code == 200
    assert r2.json()["description"] == "keep me"


def test_patch_type_and_category_compatible(client, expense_cat_id, income_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1000.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}",
                      json={"type": "income", "category_id": income_cat_id})
    assert r2.status_code == 200
    assert r2.json()["type"] == "income"


def test_patch_type_only_mismatch_422(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1000.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"type": "income"})
    assert r2.status_code == 422
    assert r2.json()["error"]["code"] == "TYPE_MISMATCH"


def test_patch_category_only_mismatch_422(client, expense_cat_id, income_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1000.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"category_id": income_cat_id})
    assert r2.status_code == 422
    assert r2.json()["error"]["code"] == "TYPE_MISMATCH"


def test_patch_404_other_user(client, other_client, other_expense_cat_id):
    r = other_client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "500",
        "category_id": other_expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"amount": "999"})
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "NOT_FOUND"


def test_patch_404_nonexistent(client):
    r = client.patch(f"/api/v1/transactions/{uuid.uuid4()}", json={"amount": "999"})
    assert r.status_code == 404


# --- delete ---

def test_delete_204(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "100.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.delete(f"/api/v1/transactions/{tx_id}")
    assert r2.status_code == 204


def test_delete_404_other_user(client, other_client, other_expense_cat_id):
    r = other_client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "100",
        "category_id": other_expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.delete(f"/api/v1/transactions/{tx_id}")
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "NOT_FOUND"


def test_delete_404_nonexistent(client):
    r = client.delete(f"/api/v1/transactions/{uuid.uuid4()}")
    assert r.status_code == 404


def test_list_filter_type(client, income_cat_id):
    client.post("/api/v1/transactions", json={
        "type": "income", "amount": "5000000.00",
        "category_id": income_cat_id, "transaction_date": "2026-09-17",
    })
    r = client.get("/api/v1/transactions?type=expense")
    assert r.status_code == 200
    assert all(i["type"] == "expense" for i in r.json()["items"])


def test_list_filter_category_id(client, expense_cat_id):
    r = client.get(f"/api/v1/transactions?category_id={expense_cat_id}")
    assert r.status_code == 200
    assert all(i["category"]["id"] == expense_cat_id for i in r.json()["items"])


def test_list_filter_date_range(client):
    r = client.get("/api/v1/transactions?date_from=2026-09-17&date_to=2026-09-17")
    assert r.status_code == 200
    assert all(i["transaction_date"] == "2026-09-17" for i in r.json()["items"])


def test_list_sort_order(client):
    r = client.get("/api/v1/transactions")
    items = r.json()["items"]
    dates = [i["transaction_date"] for i in items]
    assert dates == sorted(dates, reverse=True)


# --- PATCH explicit null on non-nullable fields → 422 ---

def test_patch_null_type_422(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "100.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"type": None})
    assert r2.status_code == 422
    assert r2.json()["error"]["code"] == "VALIDATION_ERROR"


def test_patch_null_amount_422(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "100.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"amount": None})
    assert r2.status_code == 422
    assert r2.json()["error"]["code"] == "VALIDATION_ERROR"


def test_patch_null_category_id_422(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "100.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"category_id": None})
    assert r2.status_code == 422
    assert r2.json()["error"]["code"] == "VALIDATION_ERROR"


def test_patch_null_transaction_date_422(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "100.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    tx_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/transactions/{tx_id}", json={"transaction_date": None})
    assert r2.status_code == 422
    assert r2.json()["error"]["code"] == "VALIDATION_ERROR"


# --- round-trip decimal string representation ---

def test_amount_roundtrip_2dp(client, expense_cat_id):
    # store amount with 2dp, read back via GET, verify exact JSON string
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "25000.00",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 201
    tx_id = r.json()["id"]
    assert r.json()["amount"] == "25000.00"

    r2 = client.get(f"/api/v1/transactions/{tx_id}")
    assert r2.status_code == 200
    assert r2.json()["amount"] == "25000.00"


def test_amount_roundtrip_fractional(client, expense_cat_id):
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "12345.67",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 201
    tx_id = r.json()["id"]
    assert r.json()["amount"] == "12345.67"

    r2 = client.get(f"/api/v1/transactions/{tx_id}")
    assert r2.json()["amount"] == "12345.67"


def test_amount_roundtrip_whole_number(client, expense_cat_id):
    # whole number stored as NUMERIC should come back as "50000.00" not "50000"
    r = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "50000",
        "category_id": expense_cat_id, "transaction_date": "2026-09-17",
    })
    assert r.status_code == 201
    assert r.json()["amount"] == "50000.00"
