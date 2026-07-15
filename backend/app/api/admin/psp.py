import uuid
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_admin_user, require_admin_reason, require_roles
from app.db.session import get_db
from app.models.corridor import PSPProvider
from app.models.user import User
from app.services.audit import log_audit

router = APIRouter(prefix="/psp", tags=["admin"])


@router.get("")
async def list_psp(_: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    res = await db.execute(select(PSPProvider).order_by(PSPProvider.country_code, PSPProvider.weight.desc()))
    return [
        {
            "id": str(p.id),
            "code": p.code,
            "name": p.name,
            "country_code": p.country_code,
            "capabilities": p.capabilities,
            "weight": p.weight,
            "enabled": p.enabled,
            "health_status": p.health_status,
            "success_rate_pct": p.success_rate_pct,
            "avg_latency_ms": p.avg_latency_ms,
        }
        for p in res.scalars().all()
    ]


class PspPatch(BaseModel):
    enabled: bool | None = None
    weight: int | None = None
    health_status: str | None = None


@router.patch("/{psp_id}")
async def patch_psp(
    psp_id: uuid.UUID,
    payload: PspPatch,
    request: Request,
    actor: User = Depends(require_roles("admin")),
    reason: str = Depends(require_admin_reason),
    db: AsyncSession = Depends(get_db),
) -> dict:
    res = await db.execute(select(PSPProvider).where(PSPProvider.id == psp_id))
    p = res.scalar_one_or_none()
    if not p:
        raise errors.not_found("psp.not_found", "PSP not found")
    diff: dict = {}
    for field, val in payload.model_dump(exclude_none=True).items():
        old = getattr(p, field)
        if old != val:
            diff[field] = [old, val]
            setattr(p, field, val)
    if diff:
        await log_audit(
            db,
            actor_id=actor.id,
            actor_type="staff",
            action="psp.update",
            target_type="psp",
            target_id=p.code,
            diff=diff,
            reason=reason,
            ip=request.client.host if request.client else None,
        )
    await db.commit()
    return {"ok": True, "diff": diff}
