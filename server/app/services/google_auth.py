from __future__ import annotations

import secrets
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import DomainError
from app.models.user import User
from app.services.auth import _seed_default_categories

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def generate_oauth_state() -> str:
    """Generate CSRF state token untuk alur OAuth."""
    return secrets.token_urlsafe(32)


def get_redirect_uri(request_host: str, scheme: str = "http") -> str:
    """Tentukan callback URL untuk Google OAuth."""
    if settings.google_redirect_uri:
        return settings.google_redirect_uri
    return f"{scheme}://{request_host}/api/v1/auth/google/callback"


def build_google_auth_url(state: str, redirect_uri: str) -> str:
    """Buat URL redirect otorisasi Google."""
    if not settings.is_google_auth_enabled:
        raise DomainError("Google OAuth belum dikonfigurasi.")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_google_code(code: str, redirect_uri: str) -> dict:
    """Tukar authorization code dengan access token dari Google."""
    data = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=data)
        if resp.status_code != 200:
            raise DomainError("Gagal menukar authorization code dengan token Google.")
        return resp.json()


async def fetch_google_user_info(access_token: str) -> dict:
    """Ambil data profil pengguna dari Google."""
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(GOOGLE_USERINFO_URL, headers=headers)
        if resp.status_code != 200:
            raise DomainError("Gagal mengambil data profil dari Google.")
        return resp.json()


def find_or_create_google_user(db: Session, google_id: str, email: str) -> User:
    """Cari atau buat akun pengguna berdasarkan akun Google."""
    normalized_email = email.strip().lower()

    # 1. Cari berdasarkan google_id
    user = db.scalar(select(User).where(User.google_id == google_id))
    if user:
        return user

    # 2. Cari berdasarkan email (linking akun yang sebelumnya daftar lewat email/password)
    user = db.scalar(select(User).where(User.email == normalized_email))
    if user:
        user.google_id = google_id
        db.commit()
        db.refresh(user)
        return user

    # 3. Buat user baru tanpa password
    new_user = User(
        email=normalized_email,
        google_id=google_id,
        password_hash=None,
    )
    db.add(new_user)
    db.flush()
    _seed_default_categories(db, new_user.id)
    db.commit()
    db.refresh(new_user)
    return new_user
