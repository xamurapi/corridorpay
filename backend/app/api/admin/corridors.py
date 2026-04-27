import uuid
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_admin_user, require_admin_reason
from app.db.session import get_db
from app.models.corridor import Corridor
from app.models.user import User
from app.services.audit import log_audit

router = APIRouter(prefix="/corridors", tags=["admin"])


@router.get("")
async def list_corridors(_: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    res = await db.execute(select(Corridor).order_by(Corridor.code))
    return [
        {
            "id": str(c.id),
            "code": c.code,
            "country_name_ru": c.country_name_ru,
            "country_name_en": c.country_name_en,
            "currency": c.currency,
            "currency_symbol": c.currency_symbol,
            "flag": c.flag,
            "rail": c.rail,
            "primary_psp": c.primary_psp,
            "enabled": c.enabled,
            "min_amount_minor": c.min_amount_minor,
            "max_amount_minor": c.max_amount_minor,
            "daily_limit_minor": c.daily_limit_minor,
            "base_fee_bps": c.base_fee_bps,
            "fx_markup_bps": c.fx_markup_bps,
            "rate_lock_ttl_sec": c.rate_lock_ttl_sec,
        }
        for c in res.scalars().all()
    ]


class CorridorPatch(BaseModel):
    enabled: bool | None = None
    min_amount_minor: int | None = None
    max_amount_minor: int | None = None
    daily_limit_minor: int | None = None
    base_fee_bps: int | None = None
    fx_markup_bps: int | None = None
    rate_lock_ttl_sec: int | None = None


@router.patch("/{corridor_id}")
async def patch_corridor(
    corridor_id: uuid.UUID,
    payload: CorridorPatch,
    request: Request,
    actor: User = Depends(get_admin_user),
    reason: str = Depends(require_admin_reason),
    db: AsyncSession = Depends(get_db),
) -> dict:
    res = await db.execute(select(Corridor).where(Corridor.id == corridor_id))
    c = res.scalar_one_or_none()
    if not c:
        raise errors.not_found("corridor.not_found", "Corridor not found")
    diff: dict = {}
    for field, val in payload.model_dump(exclude_none=True).items():
        old = getattr(c, field)
        if old != val:
            diff[field] = [old, val]
            setattr(c, field, val)
    if diff:
        await log_audit(
            db,
            actor_id=actor.id,
            actor_type="staff",
            action="corridor.update",
            target_type="corridor",
            target_id=c.code,
            diff=diff,
            reason=reason,
            ip=request.client.host if request.client else None,
            request_id=request.headers.get("X-Request-Id"),
        )
    await db.commit()
    return {"ok": True, "diff": diff}
