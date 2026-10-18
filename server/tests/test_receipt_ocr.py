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


def test_scan_receipt_v1_endpoint(client):
    file_content = b"fake-receipt-image-binary-data"
    files = {"file": ("struk_belanja.jpg", io.BytesIO(file_content), "image/jpeg")}

    resp = client.post("/api/v1/transactions/scan-receipt", files=files)
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


def test_scan_receipt_alias_endpoint(client):
    file_content = b"fake-receipt-image-binary-data"
    files = {"file": ("cafe_latte.jpg", io.BytesIO(file_content), "image/jpeg")}

    resp = client.post("/api/transactions/scan-receipt", files=files)
    assert resp.status_code == 200

    body = resp.json()
    assert body["success"] is True
    data = body["data"]
    assert data["merchant"] == "Kopi Kenangan"
    assert data["category"] == "Makanan"


def test_scan_receipt_empty_file(client):
    files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
    resp = client.post("/api/v1/transactions/scan-receipt", files=files)
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
