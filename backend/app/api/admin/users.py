import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_admin_user, require_admin_reason
from app.db.session import get_db
from app.models.user import User
from app.services.audit import log_audit

router = APIRouter(prefix="/users", tags=["admin"])


class UserAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    country_iso2: str | None
    role: str
    status: str
    kyc_tier: int
    email_verified: bool
    created_at: datetime
    last_login_at: datetime | None


class UsersList(BaseModel):
    items: list[UserAdminOut]
    total: int


class UserPatch(BaseModel):
    status: str | None = None  # active | suspended | closed
    role: str | None = None
    kyc_tier: int | None = None


@router.get("", response_model=UsersList)
async def list_users(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=200),
    q: str | None = None,
    status: str | None = None,
    role: str | None = None,
) -> UsersList:
    query = select(User)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(or_(func.lower(User.email).like(like), func.lower(User.full_name).like(like)))
    if status:
        query = query.where(User.status == status)
    if role:
        query = query.where(User.role == role)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    res = await db.execute(query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page))
    items = [UserAdminOut.model_validate(u) for u in res.scalars().all()]
    return UsersList(items=items, total=total)


@router.get("/{user_id}", response_model=UserAdminOut)
async def get_user(user_id: uuid.UUID, _: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)) -> UserAdminOut:
    res = await db.execute(select(User).where(User.id == user_id))
    u = res.scalar_one_or_none()
    if not u:
        raise errors.not_found("user.not_found", "User not found")
    return UserAdminOut.model_validate(u)


@router.patch("/{user_id}", response_model=UserAdminOut)
async def patch_user(
    user_id: uuid.UUID,
    payload: UserPatch,
    request: Request,
    actor: User = Depends(get_admin_user),
    reason: str = Depends(require_admin_reason),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    res = await db.execute(select(User).where(User.id == user_id))
    u = res.scalar_one_or_none()
    if not u:
        raise errors.not_found("user.not_found", "User not found")
    diff = {}
    if payload.status is not None and payload.status != u.status:
        diff["status"] = [u.status, payload.status]
        u.status = payload.status
    if payload.role is not None and payload.role != u.role:
        diff["role"] = [u.role, payload.role]
        u.role = payload.role
    if payload.kyc_tier is not None and payload.kyc_tier != u.kyc_tier:
        diff["kyc_tier"] = [u.kyc_tier, payload.kyc_tier]
        u.kyc_tier = payload.kyc_tier
    if diff:
        await log_audit(
            db,
            actor_id=actor.id,
            actor_type="staff",
            action="user.update",
            target_type="user",
            target_id=str(u.id),
            diff=diff,
            reason=reason,
            ip=request.client.host if request.client else None,
            request_id=request.headers.get("X-Request-Id"),
            user_agent=request.headers.get("user-agent"),
        )
    await db.commit()
    await db.refresh(u)
    return UserAdminOut.model_validate(u)
