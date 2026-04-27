from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from sqlalchemy import select


async def get_session(db: Annotated[AsyncSession, Depends(get_db)]) -> AsyncSession:
    return db


async def _user_from_token(token: str, db: AsyncSession) -> User:
    try:
        payload = decode_token(token)
    except ValueError:
        raise errors.unauthorized("auth.invalid_token", "Invalid token")
    if payload.get("type") != "access":
        raise errors.unauthorized("auth.wrong_token_type", "Wrong token type")
    user_id = payload.get("sub")
    if not user_id:
        raise errors.unauthorized("auth.invalid_token", "Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.status != "active":
        raise errors.unauthorized("auth.user_not_found", "User not found")
    return user


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise errors.unauthorized("auth.missing_token", "Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = _bearer(authorization)
    return await _user_from_token(token, db)


async def get_admin_user(
    authorization: Annotated[str | None, Header()] = None,
    x_admin_reason: Annotated[str | None, Header(alias="X-Admin-Reason")] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = _bearer(authorization)
    user = await _user_from_token(token, db)
    if user.role not in ("superadmin", "admin", "compliance", "support", "finance", "developer", "viewer"):
        raise errors.forbidden("admin.role_required", "Staff role required")
    return user


async def require_admin_reason(
    x_admin_reason: Annotated[str | None, Header(alias="X-Admin-Reason")] = None,
) -> str:
    if not x_admin_reason:
        raise errors.bad_request("admin.reason_required", "X-Admin-Reason header required for mutations")
    return x_admin_reason
