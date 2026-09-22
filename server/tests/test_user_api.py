"""Tests for GET/PATCH /api/v1/user/preferences."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
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
        c.post("/api/v1/auth/register", json={"email": "prefs_user@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "prefs_user@test.com", "password": "pass1234"})
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def other_client(test_engine):
    """A second user to verify isolation."""
    def override_get_db():
        db = Session(test_engine)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[deps.get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        c.post("/api/v1/auth/register", json={"email": "prefs_other@test.com", "password": "pass1234"})
        c.post("/api/v1/auth/login", json={"email": "prefs_other@test.com", "password": "pass1234"})
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# GET /api/v1/user/preferences
# ---------------------------------------------------------------------------


def test_get_preferences_default_empty(client):
    """New user has empty preferences."""
    r = client.get("/api/v1/user/preferences")
    assert r.status_code == 200
    body = r.json()
    assert "preferences" in body
    prefs = body["preferences"]
    assert prefs.get("payday") is None
    assert prefs.get("tx_sources") is None
    assert prefs.get("debt_tags") is None
    assert prefs.get("templates") is None


def test_get_preferences_unauthenticated():
    """Unauthenticated request returns 401."""
    with TestClient(app) as fresh:
        r = fresh.get("/api/v1/user/preferences")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/v1/user/preferences
# ---------------------------------------------------------------------------


def test_patch_payday(client):
    """Setting payday persists and is returned on GET."""
    r = client.patch("/api/v1/user/preferences", json={"preferences": {"payday": 25}})
    assert r.status_code == 200
    assert r.json()["preferences"]["payday"] == 25

    r2 = client.get("/api/v1/user/preferences")
    assert r2.json()["preferences"]["payday"] == 25


def test_patch_payday_validation_error(client):
    """Payday must be 1-31."""
    r = client.patch("/api/v1/user/preferences", json={"preferences": {"payday": 0}})
    assert r.status_code == 422

    r2 = client.patch("/api/v1/user/preferences", json={"preferences": {"payday": 32}})
    assert r2.status_code == 422


def test_patch_tx_sources(client):
    """tx_sources dict is stored and retrieved correctly."""
    sources = {"abc-uuid": "Tunai", "def-uuid": "Bank"}
    r = client.patch("/api/v1/user/preferences", json={"preferences": {"tx_sources": sources}})
    assert r.status_code == 200
    assert r.json()["preferences"]["tx_sources"] == sources


def test_patch_debt_tags(client):
    """debt_tags dict is stored and retrieved."""
    tags = {"tx-1": {"tag": "utang", "settled": False}}
    r = client.patch("/api/v1/user/preferences", json={"preferences": {"debt_tags": tags}})
    assert r.status_code == 200
    assert r.json()["preferences"]["debt_tags"] == tags


def test_patch_templates(client):
    """templates list is stored and retrieved."""
    templates = [{"id": "1", "name": "Kos", "amount": 1000000, "category": "Tagihan"}]
    r = client.patch("/api/v1/user/preferences", json={"preferences": {"templates": templates}})
    assert r.status_code == 200
    assert r.json()["preferences"]["templates"] == templates


def test_patch_merges_not_replaces(client):
    """PATCH only updates provided keys; other keys are preserved."""
    # Set payday first
    client.patch("/api/v1/user/preferences", json={"preferences": {"payday": 10}})

    # Now patch only tx_sources — payday must remain
    client.patch("/api/v1/user/preferences", json={"preferences": {"tx_sources": {"x": "E-wallet"}}})

    r = client.get("/api/v1/user/preferences")
    prefs = r.json()["preferences"]
    assert prefs["payday"] == 10
    assert prefs["tx_sources"] == {"x": "E-wallet"}


def test_patch_unauthenticated():
    """Unauthenticated PATCH returns 401."""
    with TestClient(app) as fresh:
        r = fresh.patch("/api/v1/user/preferences", json={"preferences": {"payday": 1}})
    assert r.status_code == 401


def test_get_preferences_corrupt_data_heals(client, test_engine):
    """Preferensi korup di DB (mis. edit manual) tidak boleh 500."""
    with Session(test_engine) as s:
        user = s.scalar(select(User).where(User.email == "prefs_user@test.com"))
        user.preferences = {"payday": 99, "kunci_ngawur": "x"}
        s.commit()

    r = client.get("/api/v1/user/preferences")
    assert r.status_code == 200
    prefs = r.json()["preferences"]
    assert prefs.get("payday") is None


# ---------------------------------------------------------------------------
# Isolation: user A cannot see/overwrite user B's preferences
# ---------------------------------------------------------------------------


def test_preferences_isolated_between_users(client, other_client):
    """Each user's preferences are independent."""
    # User A sets payday 15
    client.patch("/api/v1/user/preferences", json={"preferences": {"payday": 15}})

    # User B sets payday 20
    other_client.patch("/api/v1/user/preferences", json={"preferences": {"payday": 20}})

    # User A should still see 15 (overwritten from earlier test — reset here)
    ra = client.get("/api/v1/user/preferences")
    rb = other_client.get("/api/v1/user/preferences")

    assert ra.json()["preferences"]["payday"] == 15
    assert rb.json()["preferences"]["payday"] == 20
    # Verify they are different
    assert ra.json()["preferences"]["payday"] != rb.json()["preferences"]["payday"]
