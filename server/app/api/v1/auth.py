from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.errors import DomainError, EmailTakenError, InvalidCredentialsError
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services.auth import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _start_session(request: Request, user: User) -> None:
    request.session.clear()
    request.session["user_id"] = str(user.id)
    # Batas umur absolut sesi (cookie max_age bisa refresh tiap respons).
    request.session["issued_at"] = int(time.time())


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if settings.invite_code and body.invite_code != settings.invite_code:
        raise HTTPException(
            status_code=403,
            detail={"code": "INVALID_INVITE_CODE", "message": "Kode undangan salah."},
        )
    try:
        user = register_user(db, body.email, body.password)
    except EmailTakenError:
        raise HTTPException(
            status_code=409,
            detail={"code": "EMAIL_TAKEN", "message": "Email already registered."},
        )
    except DomainError as exc:
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST", "message": str(exc)})
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
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
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
