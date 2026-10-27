"""Regression test untuk guard konfigurasi produksi.

Menutup temuan K-01 (placeholder SECRET_KEY lolos validasi) dan K-02
(typo APP_ENV mematikan seluruh guard).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings

_STRONG_SECRET = "0123456789abcdef" * 3  # 48 char, 16 karakter unik


def _settings(**overrides) -> Settings:
    base = {
        "app_env": "production",
        "https_only": True,
        "secret_key": _STRONG_SECRET,
        "_env_file": None,
    }
    base.update(overrides)
    return Settings(**base)


@pytest.mark.parametrize(
    "placeholder",
    [
        "change-me-in-production",
        "dev-secret-key-change-in-production-min-32-chars",
        "uangku-dev-secret-key-change-in-production-min-32-chars",
        "ganti-dengan-string-acak-min-32-karakter",
        "please-change-me-please-change-me-1234",
    ],
)
def test_production_rejects_placeholder_secret(placeholder: str) -> None:
    """Semua nilai contoh yang beredar di repo harus ditolak di production."""
    with pytest.raises(ValidationError):
        _settings(secret_key=placeholder)


def test_production_rejects_short_secret() -> None:
    with pytest.raises(ValidationError):
        _settings(secret_key="abc123")


def test_production_rejects_low_entropy_secret() -> None:
    with pytest.raises(ValidationError):
        _settings(secret_key="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")


def test_production_accepts_random_secret() -> None:
    settings = _settings()
    assert settings.is_production is True


@pytest.mark.parametrize("typo", ["prod", "Production", "production ", "PRODUCTION"])
def test_app_env_typo_is_rejected(typo: str) -> None:
    """Typo APP_ENV tidak boleh diam-diam mematikan guard produksi."""
    with pytest.raises(ValidationError):
        _settings(app_env=typo)


def test_development_allows_placeholder_secret() -> None:
    """Di dev/test, nilai default tetap boleh supaya setup lokal tidak pecah."""
    settings = Settings(app_env="development", _env_file=None)
    assert settings.is_production is False
