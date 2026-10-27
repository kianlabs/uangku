from __future__ import annotations

import uuid

from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import EmailTakenError, InvalidCredentialsError
from app.models.category import Category
from app.models.user import User

_pwd_hash = PasswordHash([Argon2Hasher()])
# Hash statis untuk menyamakan waktu verifikasi saat email tidak ada / akun
# Google-only, supaya respons tidak membocorkan keberadaan akun lewat timing.
_DUMMY_HASH = _pwd_hash.hash("uangku-dummy-password-for-timing-equalization")
_DEFAULT_EXPENSE_CATEGORIES = [
    "Makanan", "Transportasi", "Belanja", "Hiburan",
    "Tagihan", "Listrik & Air", "Internet & Telepon", "Langganan Digital",
    "Cicilan & Pinjaman", "Asuransi", "Pajak & Administrasi",
    "Kebutuhan Rumah", "Pembayaran Digital", "Kesehatan", "Pendidikan",
    "Donasi & Zakat", "Lainnya",
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
        raise EmailTakenError()
    _seed_default_categories(db, user.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise EmailTakenError()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    normalized = email.strip().lower()
    user = db.scalar(select(User).where(User.email == normalized))
    # Akun Google-only punya password_hash=None. Tanpa cabang ini, pwdlib
    # melempar TypeError -> 500, yang jadi oracle enumerasi akun (500 vs 401).
    # Dummy verify menyamakan waktu respons dengan akun yang benar-benar ada.
    if user is None or not user.password_hash:
        _pwd_hash.verify(password, _DUMMY_HASH)
        raise InvalidCredentialsError()
    if not _pwd_hash.verify(password, user.password_hash):
        raise InvalidCredentialsError()
    return user


def _seed_default_categories(db: Session, user_id: uuid.UUID) -> None:
    for name in _DEFAULT_EXPENSE_CATEGORIES:
        db.add(Category(user_id=user_id, name=name, type="expense"))
    for name in _DEFAULT_INCOME_CATEGORIES:
        db.add(Category(user_id=user_id, name=name, type="income"))
