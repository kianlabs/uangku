from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.errors import DomainError, EmailTakenError, InvalidCredentialsError
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services.auth import authenticate_user, register_user
from app.services.google_auth import (
    build_google_auth_url,
    exchange_google_code,
    fetch_google_user_info,
    find_or_create_google_user,
    generate_oauth_state,
    get_redirect_uri,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _start_session(request: Request, user: User) -> None:
    request.session.clear()
    request.session["user_id"] = str(user.id)
    # Batas umur absolut sesi (cookie max_age bisa refresh tiap respons).
    request.session["issued_at"] = int(time.time())


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    try:
        user = register_user(db, body.email, body.password)
    except EmailTakenError:
        raise HTTPException(
            status_code=409,
            detail={"code": "EMAIL_TAKEN", "message": "Email already registered."},
        )
    except DomainError as exc:
        raise HTTPException(
            status_code=400, detail={"code": "BAD_REQUEST", "message": str(exc)}
        )
    _start_session(request, user)
    return {"user": UserResponse.model_validate(user).model_dump(mode="json")}


@router.post("/login")
@limiter.limit("5/minute")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    try:
        user = authenticate_user(db, body.email, body.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password.",
            },
        )
    _start_session(request, user)
    return {"user": UserResponse.model_validate(user).model_dump(mode="json")}


@router.post("/logout", status_code=204)
def logout(request: Request):
    request.session.clear()
    return Response(status_code=204)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/config")
def auth_config():
    """Kembalikan status konfigurasi autentikasi publik."""
    return {
        "google_enabled": settings.is_google_auth_enabled,
    }


@router.get("/google/login")
def google_login(request: Request):
    """Mulai alur Google OAuth 2.0."""
    if not settings.is_google_auth_enabled:
        return RedirectResponse(
            url="/masuk?error=google_not_configured", status_code=302
        )

    scheme = (
        "https"
        if settings.https_only or request.headers.get("x-forwarded-proto") == "https"
        else request.url.scheme
    )
    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or "localhost:3000"
    )
    redirect_uri = get_redirect_uri(host, scheme=scheme)

    state = generate_oauth_state()
    request.session["oauth_state"] = state
    request.session["oauth_redirect_uri"] = redirect_uri

    auth_url = build_google_auth_url(state, redirect_uri)
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Callback setelah otorisasi Google."""
    if error or not code or not state:
        return RedirectResponse(url="/masuk?error=google_auth_failed", status_code=302)

    expected_state = request.session.pop("oauth_state", None)
    redirect_uri = request.session.pop("oauth_redirect_uri", None)
    if not expected_state or expected_state != state:
        return RedirectResponse(url="/masuk?error=google_csrf_failed", status_code=302)

    if not redirect_uri:
        scheme = (
            "https"
            if settings.https_only
            or request.headers.get("x-forwarded-proto") == "https"
            else request.url.scheme
        )
        host = (
            request.headers.get("x-forwarded-host")
            or request.headers.get("host")
            or "localhost:3000"
        )
        redirect_uri = get_redirect_uri(host, scheme=scheme)

    try:
        token_data = await exchange_google_code(code, redirect_uri)
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(
                url="/masuk?error=google_auth_failed", status_code=302
            )

        user_info = await fetch_google_user_info(access_token)
        google_id = user_info.get("sub")
        email = user_info.get("email")
        if not google_id or not email:
            return RedirectResponse(
                url="/masuk?error=google_auth_failed", status_code=302
            )

        user = find_or_create_google_user(db, google_id=google_id, email=email)
    except DomainError:
        return RedirectResponse(url="/masuk?error=google_auth_failed", status_code=302)

    _start_session(request, user)
    return RedirectResponse(url="/beranda", status_code=302)
