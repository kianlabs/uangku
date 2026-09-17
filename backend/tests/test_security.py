from app.core.security import hash_password, verify_password


def test_hash_is_not_plaintext():
    assert hash_password("secret") != "secret"


def test_verify_correct():
    h = hash_password("secret")
    assert verify_password("secret", h)


def test_verify_wrong():
    h = hash_password("secret")
    assert not verify_password("wrong", h)
