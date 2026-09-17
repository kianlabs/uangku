from collections.abc import Generator

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User


def get_db() -> Generator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHENTICATED", "message": "Not authenticated."},
        )
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHENTICATED", "message": "Not authenticated."},
        )
    return user
