from __future__ import annotations

import uuid

from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.user import User

_pwd_hash = PasswordHash([Argon2Hasher()])
_DEFAULT_EXPENSE_CATEGORIES = [
    "Makanan", "Transportasi", "Belanja", "Hiburan",
    "Tagihan", "Kesehatan", "Pendidikan", "Lainnya",
]
_DEFAULT_INCOME_CATEGORIES = [
    "Gaji", "Freelance", "Bonus", "Penjualan", "Lainnya",
]


def register_user(db: Session, email: str, password: str) -> User:
    normalized = email.strip().lower()
    user = User(email=normalized, password_hash=_pwd_hash.hash(password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ValueError("email_taken")
    _seed_default_categories(db, user.id)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    normalized = email.strip().lower()
    user = db.query(User).filter(User.email == normalized).first()
    if not user or not _pwd_hash.verify(password, user.password_hash):
        raise ValueError("invalid_credentials")
    return user


def _seed_default_categories(db: Session, user_id: uuid.UUID) -> None:
    for name in _DEFAULT_EXPENSE_CATEGORIES:
        db.add(Category(user_id=user_id, name=name, type="expense"))
    for name in _DEFAULT_INCOME_CATEGORIES:
        db.add(Category(user_id=user_id, name=name, type="income"))
