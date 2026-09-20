import uuid
from collections.abc import Generator

from fastapi import Depends, HTTPException, Request
from sqlalchemy import create_engine
from sqlalchemy.exc import DataError, StatementError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.user import User

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _unauthenticated() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"code": "UNAUTHENTICATED", "message": "Not authenticated."},
    )


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("user_id")
    if not user_id:
        raise _unauthenticated()
    try:
        user_uuid = uuid.UUID(str(user_id))
    except (ValueError, AttributeError, TypeError):
        raise _unauthenticated()
    try:
        user = db.get(User, user_uuid)
    except (DataError, StatementError):
        raise _unauthenticated()
    if not user:
        raise _unauthenticated()
    return user
