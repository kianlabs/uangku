"""Tests untuk CSRF Origin check."""

from fastapi.testclient import TestClient

from app.core.csrf import is_csrf_allowed
from app.main import app


def test_get_always_allowed():
    assert is_csrf_allowed(method="GET", host="x", origin="https://evil.test", referer=None)


def test_no_origin_allowed():
    assert is_csrf_allowed(method="POST", host="api.test", origin=None, referer=None)


def test_same_origin_allowed():
    assert is_csrf_allowed(
        method="POST", host="api.test", origin="https://api.test", referer=None
    )


def test_cross_origin_rejected():
    assert not is_csrf_allowed(
        method="POST", host="api.test", origin="https://evil.test", referer=None
    )


def test_referer_fallback():
    assert is_csrf_allowed(
        method="DELETE", host="api.test", origin=None, referer="https://api.test/x"
    )
    assert not is_csrf_allowed(
        method="DELETE", host="api.test", origin=None, referer="https://evil.test/x"
    )


def test_host_with_port():
    assert is_csrf_allowed(
        method="PATCH", host="localhost:8000", origin="http://localhost:8000", referer=None
    )


def test_middleware_rejects_cross_origin_post():
    """POST dengan Origin asing ditolak 403 sebelum menyentuh endpoint."""
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.post(
            "/api/v1/auth/login",
            json={"email": "x@test.com", "password": "pass1234"},
            headers={"origin": "https://evil.test", "host": "testserver"},
        )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "CSRF_FAILED"


def test_middleware_allows_get_with_foreign_origin():
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get("/health", headers={"origin": "https://evil.test"})
    assert r.status_code == 200
