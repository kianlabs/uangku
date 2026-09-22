"""Tests untuk GET /health."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_ok():
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
