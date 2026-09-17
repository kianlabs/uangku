from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

_hash = PasswordHash([Argon2Hasher()])


def hash_password(plain: str) -> str:
    return _hash.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _hash.verify(plain, hashed)
