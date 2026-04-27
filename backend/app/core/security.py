from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_ctx.verify(plain, hashed)
    except Exception:
        return False


def _encode(data: dict[str, Any], expires_delta: timedelta) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    to_encode.update({"iat": int(now.timestamp()), "exp": int((now + expires_delta).timestamp())})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(*, sub: str, role: str, kyc_tier: int = 0, extra: dict | None = None) -> str:
    payload = {"sub": sub, "type": "access", "role": role, "tier": kyc_tier}
    if extra:
        payload.update(extra)
    return _encode(payload, timedelta(minutes=settings.ACCESS_TOKEN_TTL_MIN))


def create_refresh_token(*, sub: str, jti: str) -> str:
    return _encode({"sub": sub, "type": "refresh", "jti": jti}, timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS))


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError(str(e)) from e
