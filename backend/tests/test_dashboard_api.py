import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

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
    with TestClient(app, raise_server_exceptions=True) as c:
        c.post("/api/v1/auth/register", json={"email": "dash@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "dash@test.com", "password": "pass1234"})
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
        c.post("/api/v1/auth/register", json={"email": "dash_other@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "dash_other@test.com", "password": "pass1234"})
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


def _post_tx(client, type_, amount, cat_id, tx_date):
    return client.post("/api/v1/transactions", json={
        "type": type_, "amount": amount,
        "category_id": cat_id, "transaction_date": tx_date,
    })


# --- auth ---

def test_summary_requires_auth():
    with TestClient(app) as c:
        r = c.get("/api/v1/dashboard/summary?month=2026-09")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


# --- month validation ---

def test_summary_missing_month_422(client):
    r = client.get("/api/v1/dashboard/summary")
    assert r.status_code == 422


def test_summary_invalid_month_format_422(client):
    r = client.get("/api/v1/dashboard/summary?month=bad")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_summary_invalid_month_13_422(client):
    r = client.get("/api/v1/dashboard/summary?month=2026-13")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_summary_invalid_month_00_422(client):
    r = client.get("/api/v1/dashboard/summary?month=2026-00")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_summary_non_zero_padded_month_422(client):
    r = client.get("/api/v1/dashboard/summary?month=2026-9")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_summary_non_zero_padded_year_422(client):
    r = client.get("/api/v1/dashboard/summary?month=26-09")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


# --- response shape ---

def test_summary_response_shape(client):
    r = client.get("/api/v1/dashboard/summary?month=2030-01")
    assert r.status_code == 200
    body = r.json()
    assert body["period"] == "2030-01"
    assert isinstance(body["balance"], str)
    assert isinstance(body["monthly_income"], str)
    assert isinstance(body["monthly_expense"], str)
    assert isinstance(body["transaction_count"], int)
    assert isinstance(body["expense_by_category"], list)
    assert isinstance(body["recent_transactions"], list)


def test_summary_amounts_are_decimal_strings(client):
    r = client.get("/api/v1/dashboard/summary?month=2030-02")
    body = r.json()
    # must be string, formatted as 2dp decimal
    assert body["balance"] == "0.00"
    assert body["monthly_income"] == "0.00"
    assert body["monthly_expense"] == "0.00"


# --- data correctness ---

def test_summary_monthly_income_and_expense(client, expense_cat_id, income_cat_id):
    _post_tx(client, "income", "5000000.00", income_cat_id, "2026-09-01")
    _post_tx(client, "expense", "2000000.00", expense_cat_id, "2026-09-15")
    r = client.get("/api/v1/dashboard/summary?month=2026-09")
    assert r.status_code == 200
    body = r.json()
    assert body["monthly_income"] == "5000000.00"
    assert body["monthly_expense"] == "2000000.00"
    assert body["transaction_count"] == 2


def test_summary_balance_is_alltime(client, expense_cat_id, income_cat_id):
    # add transaction in a different month
    _post_tx(client, "income", "1000000.00", income_cat_id, "2026-08-01")
    r_sep = client.get("/api/v1/dashboard/summary?month=2026-09")
    r_aug = client.get("/api/v1/dashboard/summary?month=2026-08")
    # balance same regardless of month
    assert r_sep.json()["balance"] == r_aug.json()["balance"]


def test_summary_expense_by_category_present(client, expense_cat_id):
    r = client.get("/api/v1/dashboard/summary?month=2026-09")
    items = r.json()["expense_by_category"]
    assert len(items) > 0
    item = items[0]
    assert "category_id" in item
    assert "category_name" in item
    assert isinstance(item["amount"], str)
    assert isinstance(item["percentage"], float)


def test_summary_expense_by_category_sorted_desc(client):
    r = client.get("/api/v1/dashboard/summary?month=2026-09")
    items = r.json()["expense_by_category"]
    amounts = [float(i["amount"]) for i in items]
    assert amounts == sorted(amounts, reverse=True)


def test_summary_recent_transactions_shape(client):
    r = client.get("/api/v1/dashboard/summary?month=2026-09")
    recent = r.json()["recent_transactions"]
    assert len(recent) <= 5
    for tx in recent:
        assert "id" in tx
        assert "type" in tx
        assert isinstance(tx["amount"], str)
        assert "transaction_date" in tx
        assert "category_name" in tx


def test_summary_recent_transactions_month_filtered(client):
    r = client.get("/api/v1/dashboard/summary?month=2026-09")
    for tx in r.json()["recent_transactions"]:
        assert tx["transaction_date"].startswith("2026-09")


def test_summary_december_boundary(client, expense_cat_id):
    _post_tx(client, "expense", "100000.00", expense_cat_id, "2026-12-31")
    r = client.get("/api/v1/dashboard/summary?month=2026-12")
    assert r.status_code == 200
    assert r.json()["transaction_count"] >= 1
    # Jan 2027 should not see Dec transaction
    r2 = client.get("/api/v1/dashboard/summary?month=2027-01")
    assert r2.json()["transaction_count"] == 0


def test_summary_own_data_only(client, other_client):
    other_cat_r = other_client.get("/api/v1/categories?type=expense")
    other_cat_id = other_cat_r.json()["items"][0]["id"]
    other_client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "9999999.00",
        "category_id": other_cat_id, "transaction_date": "2026-09-10",
    })
    r = client.get("/api/v1/dashboard/summary?month=2026-09")
    body = r.json()
    # other user's 9999999 should not appear in our monthly_expense
    assert float(body["monthly_expense"]) < 9999999
