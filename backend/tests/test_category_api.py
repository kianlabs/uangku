import uuid
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core import deps
from app.core.config import settings
from app.main import app
from app.models import Base, Category, Transaction, User  # noqa: F401
from app.models.category import Category as CatModel
from app.models.transaction import Transaction as TxModel


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
        c.post("/api/v1/auth/register", json={"email": "cat_user@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "cat_user@test.com", "password": "pass1234"})
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
        c.post("/api/v1/auth/register", json={"email": "other_cat@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "other_cat@test.com", "password": "pass1234"})
        yield c
    app.dependency_overrides.clear()


# --- list ---

def test_list_requires_auth():
    with TestClient(app) as c:
        r = c.get("/api/v1/categories")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


def test_list_returns_own_categories(client):
    r = client.get("/api/v1/categories")
    assert r.status_code == 200
    assert "items" in r.json()
    assert len(r.json()["items"]) == 13  # default categories seeded on register


def test_list_filter_by_type_expense(client):
    r = client.get("/api/v1/categories?type=expense")
    assert r.status_code == 200
    assert all(i["type"] == "expense" for i in r.json()["items"])


def test_list_filter_by_type_income(client):
    r = client.get("/api/v1/categories?type=income")
    assert r.status_code == 200
    assert all(i["type"] == "income" for i in r.json()["items"])


def test_list_filter_invalid_type_422(client):
    r = client.get("/api/v1/categories?type=invalid")
    assert r.status_code == 422


def test_list_response_contract_wrapped_items(client):
    """Kontrak dengan frontend (frontend/src/lib/categories.ts): GET
    /api/v1/categories harus mengembalikan objek {"items": [...]},
    bukan array polos. Pengaman regresi bentuk respons."""
    client.post("/api/v1/categories", json={"name": "ContractGuard", "type": "expense"})
    r = client.get("/api/v1/categories")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, dict), "kontrak: respons harus objek {\"items\": [...]}, bukan array"
    assert "items" in body
    assert isinstance(body["items"], list)
    names = [i["name"] for i in body["items"]]
    assert "ContractGuard" in names
    for item in body["items"]:
        assert {"id", "name", "type"} <= set(item.keys())


def test_list_response_contract_wrapped_with_filter(client):
    r = client.get("/api/v1/categories?type=expense")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, dict) and isinstance(body.get("items"), list)


# --- create ---

def test_create_category_201(client):
    r = client.post("/api/v1/categories", json={"name": "Internet", "type": "expense"})
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Internet"
    assert body["type"] == "expense"
    assert "id" in body
    assert "created_at" in body


def test_create_category_409_duplicate(client):
    client.post("/api/v1/categories", json={"name": "DupTest", "type": "expense"})
    r = client.post("/api/v1/categories", json={"name": "DupTest", "type": "expense"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "CATEGORY_ALREADY_EXISTS"


def test_create_category_422_invalid_type(client):
    r = client.post("/api/v1/categories", json={"name": "Bad", "type": "invalid"})
    assert r.status_code == 422


def test_create_same_name_different_type_allowed(client):
    client.post("/api/v1/categories", json={"name": "Both", "type": "expense"})
    r = client.post("/api/v1/categories", json={"name": "Both", "type": "income"})
    assert r.status_code == 201


# --- update ---

def test_update_category(client):
    r = client.post("/api/v1/categories", json={"name": "OldName", "type": "expense"})
    cat_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/categories/{cat_id}", json={"name": "NewName"})
    assert r2.status_code == 200
    body = r2.json()
    assert body["name"] == "NewName"
    assert "updated_at" in body


def test_update_category_duplicate_rename_409(client):
    client.post("/api/v1/categories", json={"name": "NameA", "type": "expense"})
    r = client.post("/api/v1/categories", json={"name": "NameB", "type": "expense"})
    cat_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/categories/{cat_id}", json={"name": "NameA"})
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "CATEGORY_ALREADY_EXISTS"


def test_update_category_not_own_404(client, other_client):
    r = other_client.post("/api/v1/categories", json={"name": "OtherCat", "type": "expense"})
    cat_id = r.json()["id"]
    r2 = client.patch(f"/api/v1/categories/{cat_id}", json={"name": "Stolen"})
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "NOT_FOUND"


def test_update_category_404_nonexistent(client):
    r = client.patch(f"/api/v1/categories/{uuid.uuid4()}", json={"name": "Ghost"})
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


# --- delete ---

def test_delete_category_204(client):
    r = client.post("/api/v1/categories", json={"name": "ToDelete", "type": "expense"})
    cat_id = r.json()["id"]
    r2 = client.delete(f"/api/v1/categories/{cat_id}")
    assert r2.status_code == 204


def test_delete_category_not_own_404(client, other_client):
    r = other_client.post("/api/v1/categories", json={"name": "OtherDel", "type": "income"})
    cat_id = r.json()["id"]
    r2 = client.delete(f"/api/v1/categories/{cat_id}")
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "NOT_FOUND"


def test_delete_category_404_nonexistent(client):
    r = client.delete(f"/api/v1/categories/{uuid.uuid4()}")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


def test_delete_category_in_use_409(client, test_engine):
    r = client.post("/api/v1/categories", json={"name": "InUseAPI", "type": "expense"})
    assert r.status_code == 201
    cat_id = uuid.UUID(r.json()["id"])

    with Session(test_engine) as db:
        cat = db.get(CatModel, cat_id)
        tx = TxModel(
            user_id=cat.user_id,
            category_id=cat_id,
            type="expense",
            amount=Decimal(500),
            transaction_date=date(2026, 9, 17),
        )
        db.add(tx)
        db.commit()

    r2 = client.delete(f"/api/v1/categories/{cat_id}")
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "CATEGORY_IN_USE"
