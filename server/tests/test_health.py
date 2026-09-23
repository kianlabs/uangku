"""Tests untuk GET /health dan hardening keamanan production."""

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.deps import get_db
from app.main import app


def test_health_ok():
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_db_failure():
    def mock_db_error():
        raise OperationalError("connection refused", {}, None)

    app.dependency_overrides[get_db] = mock_db_error
    try:
        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/health")
        assert r.status_code == 503
        assert r.json()["error"]["code"] == "SERVICE_UNAVAILABLE"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_security_headers_default():
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get("/health")
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"
    assert r.headers.get("referrer-policy") == "same-origin"
    # Di mode development (https_only=False), HSTS tidak dipasang
    assert "strict-transport-security" not in r.headers


def test_security_headers_with_https_only(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "https_only", True)
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get("/health")
    assert (
        r.headers.get("strict-transport-security")
        == "max-age=31536000; includeSubDomains"
    )

