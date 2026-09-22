import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core import deps
from app.core.config import settings
from app.main import app
from app.models import (  # noqa: F401
    Base,
    Category,
    RecurringTemplate,
    Transaction,
    User,
)


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
        c.post("/api/v1/auth/register", json={"email": "rec_user@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "rec_user@test.com", "password": "pass1234"})
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


def _make(client, cat_id, **kw):
    body = {
        "name": "Internet",
        "amount": "150000",
        "type": "expense",
        "category_id": cat_id,
        "day": 20,
    }
    body.update(kw)
    return client.post("/api/v1/recurring", json=body)


def test_create_201(client, expense_cat_id):
    r = _make(client, expense_cat_id)
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Internet"
    assert body["amount"] == "150000.00"
    assert body["day"] == 20
    assert body["active"] is True
    assert body["last_confirmed"] is None
    assert body["category_id"] == expense_cat_id


def test_create_income_201(client, income_cat_id):
    r = _make(client, income_cat_id, name="Gaji", type="income")
    assert r.status_code == 201
    assert r.json()["type"] == "income"


def test_create_type_mismatch_422(client, income_cat_id):
    r = _make(client, income_cat_id, type="expense")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "TYPE_MISMATCH"


def test_create_day_out_of_range_422(client, expense_cat_id):
    r = _make(client, expense_cat_id, day=32)
    assert r.status_code == 422


def test_list_returns_created(client, expense_cat_id):
    _make(client, expense_cat_id, name="ListMe")
    r = client.get("/api/v1/recurring")
    assert r.status_code == 200
    assert any(i["name"] == "ListMe" for i in r.json()["items"])


def test_update_patch(client, expense_cat_id):
    rec_id = _make(client, expense_cat_id, name="PatchMe").json()["id"]
    r = client.patch(f"/api/v1/recurring/{rec_id}", json={"day": 3, "active": False})
    assert r.status_code == 200
    assert r.json()["day"] == 3
    assert r.json()["active"] is False


def test_update_404(client):
    r = client.patch(f"/api/v1/recurring/{uuid.uuid4()}", json={"day": 3})
    assert r.status_code == 404


def test_confirm_creates_transaction(client, expense_cat_id):
    rec_id = _make(client, expense_cat_id, name="ConfirmMe", day=1).json()["id"]
    r = client.post(f"/api/v1/recurring/{rec_id}/confirm", json={"transaction_date": "2026-09-05"})
    assert r.status_code == 201
    assert r.json()["description"] == "ConfirmMe"
    r2 = client.get("/api/v1/recurring")
    confirmed = next(i for i in r2.json()["items"] if i["id"] == rec_id)
    assert confirmed["last_confirmed"] == "2026-09-05"


def test_confirm_twice_same_month_409(client, expense_cat_id):
    rec_id = _make(client, expense_cat_id, name="TwiceMe", day=1).json()["id"]
    assert client.post(f"/api/v1/recurring/{rec_id}/confirm", json={"transaction_date": "2026-08-05"}).status_code == 201
    r = client.post(f"/api/v1/recurring/{rec_id}/confirm", json={"transaction_date": "2026-08-20"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "ALREADY_CONFIRMED"


def test_confirm_inactive_409(client, expense_cat_id):
    rec_id = _make(client, expense_cat_id, name="PausedMe").json()["id"]
    client.patch(f"/api/v1/recurring/{rec_id}", json={"active": False})
    r = client.post(f"/api/v1/recurring/{rec_id}/confirm", json={"transaction_date": "2026-09-05"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "RECURRING_INACTIVE"


def test_delete_204(client, expense_cat_id):
    rec_id = _make(client, expense_cat_id, name="DelMe").json()["id"]
    assert client.delete(f"/api/v1/recurring/{rec_id}").status_code == 204
    r = client.get("/api/v1/recurring")
    assert all(i["id"] != rec_id for i in r.json()["items"])


def test_requires_auth():
    with TestClient(app) as c:
        r = c.get("/api/v1/recurring")
    assert r.status_code == 401
