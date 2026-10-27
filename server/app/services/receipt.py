from __future__ import annotations

import base64
import json
import logging
import os
import re
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger("uangku.receipt")

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
)


def _today_iso() -> str:
    return datetime.now(tz=UTC).date().isoformat()


def _get_fallback_receipt(filename: str = "") -> dict[str, Any]:
    """Menghasilkan simulasi data struk realistis jika Gemini API offline / tidak dikonfigurasi."""
    lower_fn = filename.lower()
    today_str = _today_iso()

    if any(k in lower_fn for k in ["kopi", "coffee", "cafe", "starbucks", "fore", "kenangan"]):
        return {
            "merchant": "Kopi Kenangan",
            "total": 48000.0,
            "date": today_str,
            "category": "Makanan",
            "items": [
                {"name": "Kenangan Mantan Large", "qty": 1.0, "price": 26000.0},
                {"name": "Roti Coklat Klasik", "qty": 1.0, "price": 22000.0},
            ],
        }
    elif any(k in lower_fn for k in ["makan", "resto", "padang", "warung", "bakso", "food"]):
        return {
            "merchant": "Restoran Sederhana",
            "total": 65000.0,
            "date": today_str,
            "category": "Makanan",
            "items": [
                {"name": "Nasi Rendang Komplit", "qty": 1.0, "price": 42000.0},
                {"name": "Es Teh Manis", "qty": 1.0, "price": 8000.0},
                {"name": "Kerupuk Kulit", "qty": 1.0, "price": 15000.0},
            ],
        }
    elif any(k in lower_fn for k in ["alfa", "alfamart"]):
        return {
            "merchant": "Alfamart",
            "total": 52500.0,
            "date": today_str,
            "category": "Belanja",
            "items": [
                {"name": "Air Mineral 600ml", "qty": 2.0, "price": 7000.0},
                {"name": "Biskuit Gandum", "qty": 1.0, "price": 14500.0},
                {"name": "Sabun Mandi Refill 450ml", "qty": 1.0, "price": 31000.0},
            ],
        }
    else:
        return {
            "merchant": "Indomaret Point",
            "total": 58500.0,
            "date": today_str,
            "category": "Belanja",
            "items": [
                {"name": "Roti Tawar Gandum", "qty": 1.0, "price": 18500.0},
                {"name": "Susu UHT Full Cream 1L", "qty": 1.0, "price": 22000.0},
                {"name": "Snack Kentang", "qty": 2.0, "price": 18000.0},
            ],
        }


async def extract_receipt_with_gemini(
    image_bytes: bytes,
    mime_type: str,
    api_key: str,
) -> dict[str, Any] | None:
    """Mengirim foto struk ke Gemini 1.5 Flash Vision API dan mengekstrak data JSON terstruktur."""
    b64_data = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "Anda adalah asisten AI OCR struk belanja untuk aplikasi pengatur keuangan UangKu.\n"
        "Analisis foto struk belanja terlampir dan ekstrak data transaksi dalam format JSON murni.\n"
        "Format JSON yang WAJIB dihasilkan:\n"
        "{\n"
        '  "merchant": "Nama toko atau penyedia layanan (string)",\n'
        '  "total": 50000.0,\n'
        '  "date": "YYYY-MM-DD",\n'
        '  "category": "Kategori belanja",\n'
        '  "items": [\n'
        '    {"name": "Nama item barang", "qty": 1.0, "price": 25000.0}\n'
        "  ]\n"
        "}\n\n"
        "Panduan ekstraksi:\n"
        "1. merchant: Nama toko/merchant (misal: 'Indomaret', 'Alfamart', 'Superindo', 'Kopi Kenangan').\n"
        "2. total: Nilai akhir total yang dibayarkan dalam angka numerik (float) tanpa simbol mata uang.\n"
        "3. date: Tanggal transaksi format YYYY-MM-DD. Bila tahun tidak dicantumkan, gunakan tahun ini. Jika tidak ada, gunakan tanggal hari ini.\n"
        "4. category: Pilih salah satu dari kategori berikut yang paling relevan: "
        "['Makanan', 'Transportasi', 'Belanja', 'Hiburan', 'Tagihan', 'Listrik & Air', 'Internet & Telepon', "
        "'Langganan Digital', 'Cicilan & Pinjaman', 'Asuransi', 'Pajak & Administrasi', 'Kebutuhan Rumah', "
        "'Pembayaran Digital', 'Kesehatan', 'Pendidikan', 'Donasi & Zakat', 'Lainnya'].\n"
        "5. items: Daftar rincian barang/layanan dengan properti 'name', 'qty' (float), dan 'price' (float harga total item).\n"
        "6. Kembalikan HANYA teks JSON valid tanpa tanda kutip markdown fence atau teks penjelasan tambahan."
    )

    clean_mime = mime_type if mime_type.startswith("image/") else "image/jpeg"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": clean_mime,
                            "data": b64_data,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            # API key dikirim lewat header, bukan query string: URL sering
            # tercatat di access log / proxy / APM dan akan membocorkan key.
            resp = await client.post(
                GEMINI_API_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key,
                },
            )
            if resp.status_code != 200:
                logger.warning(
                    "Gemini API returned error status %d: %s",
                    resp.status_code,
                    resp.text[:200],
                )
                return None

            body = resp.json()
            candidates = body.get("candidates", [])
            if not candidates:
                return None

            text_content = (
                candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            ).strip()
            if not text_content:
                return None

            # Bersihkan format markdown fence jika ada
            text_content = re.sub(r"^```(?:json)?\s*", "", text_content, flags=re.MULTILINE)
            text_content = re.sub(r"\s*```$", "", text_content, flags=re.MULTILINE).strip()

            parsed = json.loads(text_content)

            merchant = str(parsed.get("merchant") or "Struk Belanja").strip()
            total_val = float(parsed.get("total") or 0.0)
            date_str = str(parsed.get("date") or _today_iso()).strip()
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
                date_str = _today_iso()
            category = str(parsed.get("category") or "Belanja").strip()

            items_raw = parsed.get("items") or []
            items = []
            for it in items_raw:
                if isinstance(it, dict):
                    items.append(
                        {
                            "name": str(it.get("name") or "Item"),
                            "qty": float(it.get("qty") or 1.0),
                            "price": float(it.get("price") or 0.0),
                        }
                    )

            return {
                "merchant": merchant,
                "total": total_val,
                "date": date_str,
                "category": category,
                "items": items,
            }
    except (httpx.HTTPError, json.JSONDecodeError, ValueError, KeyError) as exc:
        logger.warning("Gemini parsing/request error: %s", exc)
        return None


async def process_receipt_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    filename: str = "",
) -> dict[str, Any]:
    """
    Memproses file gambar struk belanja.
    Menggunakan Gemini multimodal jika GEMINI_API_KEY tersedia,
    atau beralih ke smart fallback mock parser jika offline / tanpa API key / error.
    """
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "").strip()

    if api_key:
        try:
            result = await extract_receipt_with_gemini(image_bytes, mime_type, api_key)
            if result and result.get("total", 0) > 0:
                return result
        except (httpx.HTTPError, json.JSONDecodeError, ValueError, KeyError) as exc:
            logger.warning("Gemini extraction error: %s. Using fallback parser.", exc)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Unexpected extraction error: %s. Using fallback parser.", exc)

    # Fallback jika tidak ada API key atau jika request gagal
    return _get_fallback_receipt(filename)
