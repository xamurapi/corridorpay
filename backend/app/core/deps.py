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


STAFF_ROLES = ("superadmin", "admin", "compliance", "support", "finance", "developer", "viewer")


async def get_admin_user(
    authorization: Annotated[str | None, Header()] = None,
    x_admin_reason: Annotated[str | None, Header(alias="X-Admin-Reason")] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = _bearer(authorization)
    user = await _user_from_token(token, db)
    if user.role not in STAFF_ROLES:
        raise errors.forbidden("admin.role_required", "Staff role required")
    return user


def require_roles(*allowed_roles: str):
    """Dependency factory: only staff whose role is in ``allowed_roles`` may proceed.

    ``superadmin`` always passes. Read endpoints stay on ``get_admin_user``; this
    guards privileged mutations (role changes, KYC decisions, FX overrides, …).
    """

    async def _dep(user: User = Depends(get_admin_user)) -> User:
        if user.role != "superadmin" and user.role not in allowed_roles:
            raise errors.forbidden(
                "admin.insufficient_role",
                f"Requires one of: {', '.join(('superadmin', *allowed_roles))}",
            )
        return user

    return _dep


async def require_admin_reason(
    x_admin_reason: Annotated[str | None, Header(alias="X-Admin-Reason")] = None,
) -> str:
    if not x_admin_reason:
        raise errors.bad_request("admin.reason_required", "X-Admin-Reason header required for mutations")
    # Frontend URL-encodes the reason so non-ASCII (Cyrillic) survives HTTP header
    # byte-string constraints; decode for human-readable audit logs.
    from urllib.parse import unquote

    return unquote(x_admin_reason)
