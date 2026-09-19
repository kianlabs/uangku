from __future__ import annotations

import csv
import io

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
        c.post("/api/v1/auth/register", json={"email": "export_user@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "export_user@test.com", "password": "pass1234"})
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
        c.post("/api/v1/auth/register", json={"email": "export_other@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "export_other@test.com", "password": "pass1234"})
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


def _parse_csv(content: bytes) -> list[list[str]]:
    text = content.decode("utf-8-sig")
    return list(csv.reader(io.StringIO(text)))


# --- auth ---

def test_export_requires_auth():
    with TestClient(app) as c:
        r = c.get("/api/v1/export/transactions.csv")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHENTICATED"


# --- response headers ---

def test_export_returns_csv_headers(client):
    r = client.get("/api/v1/export/transactions.csv")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    assert r.headers["content-disposition"] == 'attachment; filename="uangku-transactions.csv"'


# --- header row ---

def test_export_contains_header_row(client):
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    assert rows[0] == ["id", "date", "type", "category", "amount", "description", "created_at"]


# --- data correctness ---

def test_export_contains_transaction_data(client, expense_cat_id):
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "25000.50",
        "category_id": expense_cat_id,
        "description": "Makan siang",
        "transaction_date": "2026-09-15",
    })
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    data_rows = rows[1:]
    assert len(data_rows) >= 1
    row = next((row for row in data_rows if row[4] == "25000.50"), None)
    assert row is not None
    assert row[2] == "expense"
    assert row[4] == "25000.50"  # exact decimal string


# --- ownership ---

def test_export_only_own_data(client, other_client, other_expense_cat_id):
    other_client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "99999.00",
        "category_id": other_expense_cat_id,
        "description": "Other user tx",
        "transaction_date": "2026-09-15",
    })
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    descriptions = [row[5] for row in rows[1:]]
    assert "Other user tx" not in descriptions


# --- empty ---

def test_export_empty_no_transactions(test_engine):
    def override_get_db():
        db = Session(test_engine)
        try:
            yield db
        finally:
            db.close()

    # Save and restore existing overrides so module-scoped fixtures are not broken
    saved = dict(app.dependency_overrides)
    app.dependency_overrides[deps.get_db] = override_get_db
    try:
        with TestClient(app, raise_server_exceptions=True) as c:
            c.post("/api/v1/auth/register", json={"email": "export_empty@test.com", "password": "pass1234"})
            c.post("/api/v1/auth/login", json={"email": "export_empty@test.com", "password": "pass1234"})
            r = c.get("/api/v1/export/transactions.csv")
            rows = _parse_csv(r.content)
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(saved)
    assert r.status_code == 200
    assert len(rows) == 1
    assert rows[0][0] == "id"


# --- filters ---

def test_export_filter_type(client, income_cat_id):
    client.post("/api/v1/transactions", json={
        "type": "income", "amount": "5000000.00",
        "category_id": income_cat_id,
        "transaction_date": "2026-09-15",
    })
    r = client.get("/api/v1/export/transactions.csv?type=expense")
    rows = _parse_csv(r.content)
    data_rows = rows[1:]
    assert len(data_rows) >= 1
    assert all(row[2] == "expense" for row in data_rows)


def test_export_filter_category_id(client):
    """Filter by category_id must return only transactions for that exact category."""
    # Create a uniquely named category so we can identify it unambiguously in the CSV
    r = client.post("/api/v1/categories", json={"name": "ExportFilterCat", "type": "expense"})
    assert r.status_code == 201
    target_cat_id = r.json()["id"]
    target_cat_name = r.json()["name"]

    # Create a second category to ensure the filter excludes it
    r2 = client.post("/api/v1/categories", json={"name": "ExportOtherCat", "type": "expense"})
    assert r2.status_code == 201
    other_cat_id = r2.json()["id"]

    # Transaction in the target category
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "777.00",
        "category_id": target_cat_id,
        "description": "filter-cat-target",
        "transaction_date": "2026-09-12",
    })
    # Transaction in the other category — must not appear
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "888.00",
        "category_id": other_cat_id,
        "description": "filter-cat-other",
        "transaction_date": "2026-09-12",
    })

    r = client.get(f"/api/v1/export/transactions.csv?category_id={target_cat_id}")
    rows = _parse_csv(r.content)
    data_rows = rows[1:]

    assert len(data_rows) >= 1
    # Every row must belong to the target category
    assert all(row[3] == target_cat_name for row in data_rows), (
        f"Expected all rows to have category '{target_cat_name}', got: {[row[3] for row in data_rows]}"
    )
    # The other category must not appear
    assert not any(row[5] == "filter-cat-other" for row in data_rows)


def test_export_filter_date_range(client, expense_cat_id):
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1000.00",
        "category_id": expense_cat_id,
        "transaction_date": "2026-08-01",
    })
    r = client.get("/api/v1/export/transactions.csv?date_from=2026-09-01&date_to=2026-09-30")
    rows = _parse_csv(r.content)
    data_rows = rows[1:]
    assert all("2026-09-01" <= row[1] <= "2026-09-30" for row in data_rows)


def test_export_filter_invalid_type_422(client):
    r = client.get("/api/v1/export/transactions.csv?type=bad")
    assert r.status_code == 422


# --- sort ---

def test_export_sort_order(client):
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    dates = [row[1] for row in rows[1:]]
    assert dates == sorted(dates, reverse=True)


def test_export_sort_tiebreak_created_at(client, expense_cat_id):
    """Two transactions on the same date: the one created later must appear first (created_at DESC)."""
    # Create two transactions with the same transaction_date sequentially so
    # created_at differs (SQLAlchemy uses server now() at insert time).
    r1 = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "100.00",
        "category_id": expense_cat_id,
        "description": "tiebreak-first-created",
        "transaction_date": "2026-07-01",
    })
    assert r1.status_code == 201
    id_first = r1.json()["id"]

    r2 = client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "200.00",
        "category_id": expense_cat_id,
        "description": "tiebreak-second-created",
        "transaction_date": "2026-07-01",
    })
    assert r2.status_code == 201
    id_second = r2.json()["id"]

    r = client.get("/api/v1/export/transactions.csv?date_from=2026-07-01&date_to=2026-07-01")
    rows = _parse_csv(r.content)
    data_rows = rows[1:]

    ids = [row[0] for row in data_rows]
    assert id_second in ids
    assert id_first in ids
    # created later (id_second) must come before created earlier (id_first)
    assert ids.index(id_second) < ids.index(id_first), (
        "Expected transaction created later to appear first (created_at DESC tie-break)"
    )


# --- description edge cases ---

def test_export_description_empty_string(client, expense_cat_id):
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1000.00",
        "category_id": expense_cat_id,
        "transaction_date": "2026-09-16",
        # no description
    })
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    empty_desc_rows = [row for row in rows[1:] if row[5] == ""]
    assert len(empty_desc_rows) >= 1


# --- amount precision ---

def test_export_amount_exact_decimal(client, expense_cat_id):
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "50000",
        "category_id": expense_cat_id,
        "transaction_date": "2026-09-16",
    })
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    amounts = [row[4] for row in rows[1:]]
    assert "50000.00" in amounts
    assert "50000.0" not in amounts


# --- encoding ---

def test_export_utf8_bom(client):
    r = client.get("/api/v1/export/transactions.csv")
    assert r.content[:3] == b"\xef\xbb\xbf"


# --- CSV escaping (comma, quote, newline in field values) ---

def test_export_csv_escaping(client, expense_cat_id):
    """csv.writer must correctly escape comma, double-quote, and embedded newline."""
    tricky_desc = 'has,comma and "quote" and\nnewline'
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "111.00",
        "category_id": expense_cat_id,
        "description": tricky_desc,
        "transaction_date": "2026-09-10",
    })
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    # csv.reader should reconstruct the original value exactly
    matched = [row for row in rows[1:] if row[5] == tricky_desc]
    assert len(matched) == 1


# --- formula injection (apostrophe prefix on user-controlled fields) ---

@pytest.mark.parametrize("trigger_char", ["=", "+", "-", "@"])
def test_export_formula_injection_trigger_chars(client, expense_cat_id, trigger_char):
    desc = f"{trigger_char}SUM(1)"
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1.00",
        "category_id": expense_cat_id,
        "description": desc,
        "transaction_date": "2026-09-11",
    })
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    matched = [row for row in rows[1:] if row[5] == f"'{trigger_char}SUM(1)"]
    assert len(matched) >= 1, f"Expected apostrophe prefix for trigger char '{trigger_char}'"


def test_export_formula_injection_leading_whitespace(client, expense_cat_id):
    """Leading whitespace before trigger char still gets apostrophe prefix."""
    desc = "  =SUM(1)"
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1.00",
        "category_id": expense_cat_id,
        "description": desc,
        "transaction_date": "2026-09-11",
    })
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    matched = [row for row in rows[1:] if row[5] == "'  =SUM(1)"]
    assert len(matched) >= 1


def test_export_no_injection_plain_text(client, expense_cat_id):
    """Plain description must NOT get apostrophe prefix."""
    desc = "Makan siang biasa"
    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1.00",
        "category_id": expense_cat_id,
        "description": desc,
        "transaction_date": "2026-09-11",
    })
    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)
    matched = [row for row in rows[1:] if row[5] == desc]
    assert len(matched) >= 1


# --- formula injection on category name ---

def test_export_formula_injection_category_name(client):
    """Category with a formula-trigger name gets apostrophe prefix in CSV; DB value unchanged."""
    # Create a category whose name starts with a formula trigger char
    r = client.post("/api/v1/categories", json={"name": "=SUM(1) Special", "type": "expense"})
    assert r.status_code == 201
    cat_id = r.json()["id"]
    cat_name_in_db = r.json()["name"]
    assert cat_name_in_db == "=SUM(1) Special"  # DB stores original, no mutation

    client.post("/api/v1/transactions", json={
        "type": "expense", "amount": "1.00",
        "category_id": cat_id,
        "description": "injection-cat-test",
        "transaction_date": "2026-09-11",
    })

    r = client.get("/api/v1/export/transactions.csv")
    rows = _parse_csv(r.content)

    # Find our transaction row by description
    matched = [row for row in rows[1:] if row[5] == "injection-cat-test"]
    assert len(matched) == 1, "Expected exactly one row with description 'injection-cat-test'"

    csv_category_value = matched[0][3]
    # CSV output must have apostrophe prefix
    assert csv_category_value == "'=SUM(1) Special", (
        f"Expected apostrophe-prefixed category in CSV, got: {csv_category_value!r}"
    )

    # Verify the DB value is unchanged — re-fetch via categories API
    r_cats = client.get("/api/v1/categories?type=expense")
    cat_names = [c["name"] for c in r_cats.json()["items"]]
    assert "=SUM(1) Special" in cat_names, "DB category name must not be mutated by export"
    assert "'=SUM(1) Special" not in cat_names, "Apostrophe must only appear in CSV output, not in DB"
