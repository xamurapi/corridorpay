"""Unit tests for password hashing and JWT — no DB needed."""
import pytest
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify():
    h = hash_password("secret-password-12345")
    assert h != "secret-password-12345"
    assert verify_password("secret-password-12345", h)
    assert not verify_password("wrong", h)


def test_access_token_round_trip():
    tok = create_access_token(sub="user-1", role="user", kyc_tier=2)
    data = decode_token(tok)
    assert data["sub"] == "user-1"
    assert data["role"] == "user"
    assert data["tier"] == 2
    assert data["type"] == "access"


def test_refresh_token_round_trip():
    tok = create_refresh_token(sub="user-1", jti="abc")
    data = decode_token(tok)
    assert data["sub"] == "user-1"
    assert data["jti"] == "abc"
    assert data["type"] == "refresh"


def test_decode_invalid_raises():
    with pytest.raises(ValueError):
        decode_token("not-a-jwt")
