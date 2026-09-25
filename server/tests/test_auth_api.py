import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core import deps
from app.core.config import settings
from app.main import app
from app.models import Base, Category, User  # noqa: F401


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    engine = create_engine(settings.database_url_test)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


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


def test_register_201(client):
    r = client.post("/api/v1/auth/register", json={"email": "a@test.com", "password": "pass1234"})
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "a@test.com"
    assert "id" in body["user"]
    assert "created_at" in body["user"]


def test_register_409_duplicate(client):
    client.post("/api/v1/auth/register", json={"email": "dup@test.com", "password": "pass1234"})
    r = client.post("/api/v1/auth/register", json={"email": "dup@test.com", "password": "pass5678"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "EMAIL_TAKEN"


def test_register_422_invalid_email(client):
    r = client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "pass1234"})
    assert r.status_code == 422



def test_register_422_short_password(client):
    r = client.post("/api/v1/auth/register", json={"email": "short@test.com", "password": "abc"})
    assert r.status_code == 422
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert any(f["field"] == "password" for f in body["error"]["fields"])

def test_login_200(client):
    client.post("/api/v1/auth/register", json={"email": "login@test.com", "password": "pass1234"})
    r = client.post("/api/v1/auth/login", json={"email": "login@test.com", "password": "pass1234"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "login@test.com"


def test_login_401_wrong_password(client):
    client.post("/api/v1/auth/register", json={"email": "wp@test.com", "password": "correct1"})
    r = client.post("/api/v1/auth/login", json={"email": "wp@test.com", "password": "wrong"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_401_unknown_email(client):
    r = client.post("/api/v1/auth/login", json={"email": "ghost@test.com", "password": "whatever1"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_authenticated(client):
    client.post("/api/v1/auth/register", json={"email": "me@test.com", "password": "pass1234"})
    client.post("/api/v1/auth/login", json={"email": "me@test.com", "password": "pass1234"})
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "me@test.com"


def test_me_unauthenticated():
    with TestClient(app) as fresh:
        r = fresh.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_logout_204(client):
    client.post("/api/v1/auth/register", json={"email": "out@test.com", "password": "pass1234"})
    client.post("/api/v1/auth/login", json={"email": "out@test.com", "password": "pass1234"})
    r = client.post("/api/v1/auth/logout")
    assert r.status_code == 204


def test_me_after_logout(client):
    client.post("/api/v1/auth/register", json={"email": "postout@test.com", "password": "pass1234"})
    client.post("/api/v1/auth/login", json={"email": "postout@test.com", "password": "pass1234"})
    client.post("/api/v1/auth/logout")
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_register_429_rate_limited():
    """Test that register endpoint returns 429 after 5 requests per minute."""
    with TestClient(app, raise_server_exceptions=True) as fresh_client:
        # Make 5 successful requests (should all pass)
        for i in range(5):
            r = fresh_client.post(
                "/api/v1/auth/register",
                json={"email": f"rl{i}@test.com", "password": "pass1234"}
            )
            assert r.status_code == 201, f"Request {i+1} failed with {r.status_code}"

        # 6th request should be rate limited
        r = fresh_client.post(
            "/api/v1/auth/register",
            json={"email": "rl6@test.com", "password": "pass1234"}
        )
        assert r.status_code == 429
        body = r.json()
        assert body["error"]["code"] == "RATE_LIMITED"
        assert "Rate limit exceeded" in body["error"]["message"]


def test_login_429_rate_limited():
    """Test that login endpoint returns 429 after 5 requests per minute."""
    # Register a test user first
    with TestClient(app, raise_server_exceptions=True) as setup_client:
        setup_client.post(
            "/api/v1/auth/register",
            json={"email": "ratetest@test.com", "password": "correctpass123"}
        )

    # Use a fresh client to test rate limiting on login
    with TestClient(app, raise_server_exceptions=True) as fresh_client:
        # Make 5 login attempts (should all pass or fail auth, but not rate limited)
        for i in range(5):
            r = fresh_client.post(
                "/api/v1/auth/login",
                json={"email": "ratetest@test.com", "password": "wrongpass"}
            )
            assert r.status_code == 401, f"Request {i+1} failed with {r.status_code}"

        # 6th request should be rate limited
        r = fresh_client.post(
            "/api/v1/auth/login",
            json={"email": "ratetest@test.com", "password": "wrongpass"}
        )
        assert r.status_code == 429
        body = r.json()
        assert body["error"]["code"] == "RATE_LIMITED"
        assert "Rate limit exceeded" in body["error"]["message"]


def test_login_sets_session_max_age_7_days(client):
    client.post("/api/v1/auth/register", json={"email": "sess@test.com", "password": "pass1234"})
    r = client.post("/api/v1/auth/login", json={"email": "sess@test.com", "password": "pass1234"})
    assert r.status_code == 200
    assert "Max-Age=604800" in r.headers.get("set-cookie", "")


def test_session_without_or_expired_issued_at_rejected(setup_db):
    """Sesi lama (tanpa issued_at) atau kedaluwarsa (>7 hari) → 401."""
    import uuid as uuid_mod

    from fastapi import HTTPException, Request

    from app.core.deps import get_current_user

    test_engine = create_engine(settings.database_url_test)
    with Session(test_engine) as db:
        no_stamp = Request({"type": "http", "headers": [], "session": {"user_id": str(uuid_mod.uuid4())}})
        with pytest.raises(HTTPException) as ei:
            get_current_user(no_stamp, db)
        assert ei.value.status_code == 401

        expired = Request({"type": "http", "headers": [], "session": {
            "user_id": str(uuid_mod.uuid4()), "issued_at": 1,
        }})
        with pytest.raises(HTTPException) as ei2:
            get_current_user(expired, db)
        assert ei2.value.status_code == 401


def test_register_open(client):
    """Registrasi terbuka untuk semua orang."""
    r = client.post("/api/v1/auth/register", json={"email": "open@test.com", "password": "pass1234"})
    assert r.status_code == 201
