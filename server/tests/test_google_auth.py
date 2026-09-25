from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core import deps
from app.core.config import settings
from app.main import app
from app.models import Base, Category, User


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    engine = create_engine(settings.database_url_test)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session():
    engine = create_engine(settings.database_url_test)
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def client(setup_db):
    test_engine = create_engine(settings.database_url_test)

    def override_get_db():
        db = Session(test_engine)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[deps.get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


def test_auth_config_google_disabled(client):
    with patch.object(settings, "google_client_id", ""), patch.object(
        settings, "google_client_secret", ""
    ):
        res = client.get("/api/v1/auth/config")
        assert res.status_code == 200
        assert res.json() == {"google_enabled": False}


def test_auth_config_google_enabled(client):
    with patch.object(settings, "google_client_id", "test-client-id"), patch.object(
        settings, "google_client_secret", "test-client-secret"
    ):
        res = client.get("/api/v1/auth/config")
        assert res.status_code == 200
        assert res.json() == {"google_enabled": True}


def test_google_login_not_configured(client):
    with patch.object(settings, "google_client_id", ""), patch.object(
        settings, "google_client_secret", ""
    ):
        res = client.get("/api/v1/auth/google/login", follow_redirects=False)
        assert res.status_code == 302
        assert "/masuk?error=google_not_configured" in res.headers["location"]


def test_google_login_redirect_when_configured(client):
    with patch.object(settings, "google_client_id", "test-client-id"), patch.object(
        settings, "google_client_secret", "test-client-secret"
    ):
        res = client.get("/api/v1/auth/google/login", follow_redirects=False)
        assert res.status_code == 302
        location = res.headers["location"]
        assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth")
        assert "client_id=test-client-id" in location
        assert "response_type=code" in location
        assert "state=" in location


def test_google_callback_with_error(client):
    res = client.get("/api/v1/auth/google/callback?error=access_denied", follow_redirects=False)
    assert res.status_code == 302
    assert "/masuk?error=google_auth_failed" in res.headers["location"]


def test_google_callback_missing_params(client):
    res = client.get("/api/v1/auth/google/callback", follow_redirects=False)
    assert res.status_code == 302
    assert "/masuk?error=google_auth_failed" in res.headers["location"]


def test_google_callback_csrf_mismatch(client):
    # Set a session with oauth_state
    with patch.object(settings, "google_client_id", "cid"), patch.object(
        settings, "google_client_secret", "sec"
    ):
        login_res = client.get("/api/v1/auth/google/login", follow_redirects=False)
        assert login_res.status_code == 302

    # Callback with wrong state
    cb_res = client.get(
        "/api/v1/auth/google/callback?code=some_code&state=wrong_state",
        follow_redirects=False,
    )
    assert cb_res.status_code == 302
    assert "/masuk?error=google_csrf_failed" in cb_res.headers["location"]


@patch("app.api.v1.auth.exchange_google_code", new_callable=AsyncMock)
@patch("app.api.v1.auth.fetch_google_user_info", new_callable=AsyncMock)
def test_google_callback_success_creates_user(
    mock_fetch_info, mock_exchange, client, db_session
):
    mock_exchange.return_value = {"access_token": "fake-access-token"}
    mock_fetch_info.return_value = {
        "sub": "google-user-12345",
        "email": "googleuser@example.com",
        "email_verified": True,
        "name": "Google User",
    }

    with patch.object(settings, "google_client_id", "cid"), patch.object(
        settings, "google_client_secret", "sec"
    ):
        # 1. Login to generate session state
        login_res = client.get("/api/v1/auth/google/login", follow_redirects=False)
        assert login_res.status_code == 302
        location = login_res.headers["location"]
        # Extract state from location
        from urllib.parse import parse_qs, urlparse

        parsed = urlparse(location)
        state = parse_qs(parsed.query)["state"][0]

        # 2. Callback with valid state
        cb_res = client.get(
            f"/api/v1/auth/google/callback?code=valid_code&state={state}",
            follow_redirects=False,
        )
        assert cb_res.status_code == 302
        assert "/beranda" in cb_res.headers["location"]

        # 3. Check user in DB
        user = db_session.scalar(
            select(User).where(User.google_id == "google-user-12345")
        )
        assert user is not None
        assert user.email == "googleuser@example.com"
        assert user.password_hash is None

        # Check seeded categories
        cats = db_session.scalars(select(Category).where(Category.user_id == user.id)).all()
        assert len(cats) > 0


@patch("app.api.v1.auth.exchange_google_code", new_callable=AsyncMock)
@patch("app.api.v1.auth.fetch_google_user_info", new_callable=AsyncMock)
def test_google_callback_links_existing_email(
    mock_fetch_info, mock_exchange, client, db_session
):
    # Register existing email first
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "existing@example.com", "password": "password123"},
    )
    assert reg.status_code == 201

    mock_exchange.return_value = {"access_token": "fake-access-token-2"}
    mock_fetch_info.return_value = {
        "sub": "google-existing-999",
        "email": "existing@example.com",
    }

    with patch.object(settings, "google_client_id", "cid"), patch.object(
        settings, "google_client_secret", "sec"
    ):
        login_res = client.get("/api/v1/auth/google/login", follow_redirects=False)
        from urllib.parse import parse_qs, urlparse

        state = parse_qs(urlparse(login_res.headers["location"]).query)["state"][0]

        cb_res = client.get(
            f"/api/v1/auth/google/callback?code=code_2&state={state}",
            follow_redirects=False,
        )
        assert cb_res.status_code == 302
        assert "/beranda" in cb_res.headers["location"]

        user = db_session.scalar(
            select(User).where(User.email == "existing@example.com")
        )
        assert user is not None
        assert user.google_id == "google-existing-999"
        assert user.password_hash is not None  # original password intact
