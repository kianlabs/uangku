from datetime import UTC, datetime

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
    # Desember terakhir yang sudah lewat (validasi menolak tanggal masa depan).
    today = datetime.now(UTC).date()
    dec_year = today.year if today.month == 12 else today.year - 1
    jan_year = dec_year + 1
    _post_tx(client, "expense", "100000.00", expense_cat_id, f"{dec_year}-12-31")
    r = client.get(f"/api/v1/dashboard/summary?month={dec_year}-12")
    assert r.status_code == 200
    assert r.json()["transaction_count"] >= 1
    # Januari berikutnya tidak boleh melihat transaksi Desember
    r2 = client.get(f"/api/v1/dashboard/summary?month={jan_year}-01")
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


# ===========================================================================
# GET /api/v1/dashboard/metrics
# ===========================================================================


def test_metrics_requires_auth():
    with TestClient(app) as c:
        r = c.get("/api/v1/dashboard/metrics")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


def test_metrics_response_shape(client):
    r = client.get("/api/v1/dashboard/metrics?payday=25")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["transaction_dates"], list)
    assert isinstance(body["week_expense_total"], str)
    assert body["week_top_category"] is None or isinstance(body["week_top_category"], str)
    assert isinstance(body["safe_to_spend"], str)
    assert isinstance(body["days_left"], int)
    assert isinstance(body["remaining_balance"], str)
    assert body["payday"] == 25


def test_metrics_default_payday_is_1(client):
    r = client.get("/api/v1/dashboard/metrics")
    assert r.status_code == 200
    assert r.json()["payday"] == 1


def test_metrics_payday_validation(client):
    r = client.get("/api/v1/dashboard/metrics?payday=0")
    assert r.status_code == 422

    r2 = client.get("/api/v1/dashboard/metrics?payday=32")
    assert r2.status_code == 422


def test_metrics_amounts_are_decimal_strings(client):
    r = client.get("/api/v1/dashboard/metrics?payday=25")
    body = r.json()
    # All money fields must be decimal strings with 2dp
    for field in ("week_expense_total", "safe_to_spend", "remaining_balance"):
        value = body[field]
        assert isinstance(value, str), f"{field} should be a string"
        # Should be parseable as a float
        float(value)


def test_metrics_dates_are_strings(client, expense_cat_id):
    # Add a transaction to ensure some dates are returned
    today_str = datetime.now(UTC).date().isoformat()
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "5000.00",
        "category_id": expense_cat_id, "transaction_date": today_str,
    })
    r = client.get("/api/v1/dashboard/metrics")
    dates = r.json()["transaction_dates"]
    assert isinstance(dates, list)
    for d in dates:
        assert isinstance(d, str)
        assert len(d) == 10  # "YYYY-MM-DD"


def test_metrics_own_data_only(client, other_client):
    """Metrics only reflect current user's transactions."""
    # other_client adds a large transaction
    other_cat_r = other_client.get("/api/v1/categories?type=income")
    other_income_id = other_cat_r.json()["items"][0]["id"]
    other_client.post("/api/v1/transactions", json={
        "type": "income", "amount": "99999999.00",
        "category_id": other_income_id,
        "transaction_date": datetime.now(UTC).date().isoformat(),
    })

    r = client.get("/api/v1/dashboard/metrics?payday=25")
    body = r.json()
    # Our remaining_balance should NOT include the other user's 99999999 income
    assert float(body["remaining_balance"]) < 99999999


# ---------------------------------------------------------------------------
# POST /api/v1/dashboard/demo-data
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def demo_client(test_engine):
    def override_get_db():
        db = Session(test_engine)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[deps.get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        c.post("/api/v1/auth/register", json={"email": "dash_demo@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "dash_demo@test.com", "password": "pass1234"})
        yield c
    app.dependency_overrides.clear()


def test_demo_data_seeds_new_user(demo_client):
    """User baru dapat contoh data (201) + is_opening_balance terekspos."""
    r = demo_client.post("/api/v1/dashboard/demo-data")
    assert r.status_code == 201
    body = r.json()
    assert body["transactions"] >= 10
    assert body["budgets"] == 2

    r2 = demo_client.get("/api/v1/transactions?page=1&page_size=1")
    assert "is_opening_balance" in r2.json()["items"][0]


def test_demo_data_rejects_when_has_data(demo_client):
    """Seed kedua ditolak 409 agar data asli tidak ketimpa."""
    r = demo_client.post("/api/v1/dashboard/demo-data")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "ALREADY_HAS_DATA"
