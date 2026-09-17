import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core import deps
from app.core.config import settings
from app.db.base import Base
from app.main import app
from app.models import Category, User  # noqa: F401


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
    client.post("/api/v1/auth/register", json={"email": "dup@test.com", "password": "x"})
    r = client.post("/api/v1/auth/register", json={"email": "dup@test.com", "password": "y"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "EMAIL_TAKEN"


def test_register_422_invalid_email(client):
    r = client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "x"})
    assert r.status_code == 422


def test_login_200(client):
    client.post("/api/v1/auth/register", json={"email": "login@test.com", "password": "pass1234"})
    r = client.post("/api/v1/auth/login", json={"email": "login@test.com", "password": "pass1234"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "login@test.com"


def test_login_401_wrong_password(client):
    client.post("/api/v1/auth/register", json={"email": "wp@test.com", "password": "correct"})
    r = client.post("/api/v1/auth/login", json={"email": "wp@test.com", "password": "wrong"})
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
    client.post("/api/v1/auth/register", json={"email": "out@test.com", "password": "pass"})
    client.post("/api/v1/auth/login", json={"email": "out@test.com", "password": "pass"})
    r = client.post("/api/v1/auth/logout")
    assert r.status_code == 204


def test_me_after_logout(client):
    client.post("/api/v1/auth/register", json={"email": "postout@test.com", "password": "pass"})
    client.post("/api/v1/auth/login", json={"email": "postout@test.com", "password": "pass"})
    client.post("/api/v1/auth/logout")
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
