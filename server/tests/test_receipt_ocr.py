from __future__ import annotations

import io
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.receipt import _get_fallback_receipt, process_receipt_image


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


def test_fallback_receipt_generator():
    receipt_kopi = _get_fallback_receipt("kopi_kenangan.jpg")
    assert receipt_kopi["merchant"] == "Kopi Kenangan"
    assert receipt_kopi["category"] == "Makanan"
    assert receipt_kopi["total"] > 0
    assert len(receipt_kopi["items"]) > 0

    receipt_resto = _get_fallback_receipt("makan_siang.png")
    assert receipt_resto["merchant"] == "Restoran Sederhana"
    assert receipt_resto["category"] == "Makanan"

    receipt_alfa = _get_fallback_receipt("struk_alfamart.jpeg")
    assert receipt_alfa["merchant"] == "Alfamart"
    assert receipt_alfa["category"] == "Belanja"

    receipt_default = _get_fallback_receipt("unknown_struk.jpg")
    assert receipt_default["merchant"] == "Indomaret Point"
    assert receipt_default["category"] == "Belanja"


_JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"fake-receipt-image-binary-data"
_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"fake-receipt-image-binary-data"


@pytest.fixture(scope="module")
def auth_client(client):
    """Client dengan sesi login (scan-receipt sekarang wajib terautentikasi)."""
    email = "ocr-scan@test.com"
    password = "pass1234"
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert resp.status_code in (201, 409), resp.text
    if resp.status_code == 409:
        # Akun sudah ada dari run sebelumnya — login untuk dapat cookie sesi.
        login = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200, login.text
    return client


def test_scan_receipt_requires_auth():
    """Kedua route (v1 + alias) harus menolak request tanpa sesi."""
    with TestClient(app, raise_server_exceptions=True) as anon:
        for path in (
            "/api/v1/transactions/scan-receipt",
            "/api/transactions/scan-receipt",
        ):
            files = {"file": ("struk.jpg", io.BytesIO(_JPEG_BYTES), "image/jpeg")}
            resp = anon.post(path, files=files)
            assert resp.status_code == 401, f"{path} -> {resp.status_code}"


def test_scan_receipt_rejects_non_image(auth_client):
    """Content-Type dari client tidak dipercaya; isi file yang menentukan."""
    files = {"file": ("struk.jpg", io.BytesIO(b"<html>not an image</html>"), "image/jpeg")}
    resp = auth_client.post("/api/v1/transactions/scan-receipt", files=files)
    assert resp.status_code == 415
    assert resp.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_scan_receipt_rejects_oversize(auth_client, monkeypatch):
    from app.api.v1 import transactions as tx_module

    monkeypatch.setattr(tx_module, "_MAX_RECEIPT_BYTES", 1024)
    payload = _JPEG_BYTES + b"x" * 2048
    files = {"file": ("struk.jpg", io.BytesIO(payload), "image/jpeg")}
    resp = auth_client.post("/api/v1/transactions/scan-receipt", files=files)
    assert resp.status_code == 413
    assert resp.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_scan_receipt_v1_endpoint(auth_client):
    files = {"file": ("struk_belanja.jpg", io.BytesIO(_JPEG_BYTES), "image/jpeg")}

    resp = auth_client.post("/api/v1/transactions/scan-receipt", files=files)
    assert resp.status_code == 200

    body = resp.json()
    assert body["success"] is True
    data = body["data"]
    assert "merchant" in data
    assert "total" in data
    assert "date" in data
    assert "category" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) > 0


def test_scan_receipt_alias_endpoint(auth_client):
    files = {"file": ("cafe_latte.jpg", io.BytesIO(_PNG_BYTES), "image/png")}

    resp = auth_client.post("/api/transactions/scan-receipt", files=files)
    assert resp.status_code == 200

    body = resp.json()
    assert body["success"] is True
    data = body["data"]
    assert data["merchant"] == "Kopi Kenangan"
    assert data["category"] == "Makanan"


def test_scan_receipt_empty_file(auth_client):
    files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
    resp = auth_client.post("/api/v1/transactions/scan-receipt", files=files)
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "EMPTY_FILE"


@pytest.mark.anyio
async def test_process_receipt_gemini_success():
    fake_gemini_json = {
        "merchant": "Superindo Duren Sawit",
        "total": 125000.0,
        "date": "2026-10-18",
        "category": "Belanja",
        "items": [
            {"name": "Apel Fuji", "qty": 1.0, "price": 45000.0},
            {"name": "Beras 5kg", "qty": 1.0, "price": 80000.0},
        ],
    }

    with patch("app.services.receipt.settings.gemini_api_key", "mock-key"), patch(
        "app.services.receipt.extract_receipt_with_gemini",
        new_callable=AsyncMock,
        return_value=fake_gemini_json,
    ):
        res = await process_receipt_image(b"fake-bytes", "image/jpeg", "test.jpg")
        assert res["merchant"] == "Superindo Duren Sawit"
        assert res["total"] == 125000.0
        assert res["items"][0]["name"] == "Apel Fuji"


@pytest.mark.anyio
async def test_process_receipt_gemini_failure_fallback():
    with patch("app.services.receipt.settings.gemini_api_key", "mock-key"), patch(
        "app.services.receipt.extract_receipt_with_gemini",
        new_callable=AsyncMock,
        side_effect=Exception("API timeout"),
    ):
        # Must not crash, should fall back to mock
        res = await process_receipt_image(b"fake-bytes", "image/jpeg", "kopi.jpg")
        assert res["merchant"] == "Kopi Kenangan"
        assert res["total"] > 0
