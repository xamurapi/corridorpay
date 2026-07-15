import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_admin_user, require_admin_reason, require_roles
from app.db.session import get_db
from app.models.fx import FxRate
from app.models.user import User
from app.services.audit import log_audit

router = APIRouter(prefix="/fx", tags=["admin"])


@router.get("/rates")
async def list_rates(_: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    res = await db.execute(select(FxRate).order_by(FxRate.base, FxRate.quote))
    return [
        {
            "base": r.base,
            "quote": r.quote,
            "rate": float(r.rate),
            "source": r.source,
            "fetched_at": r.fetched_at.isoformat() if r.fetched_at else None,
        }
        for r in res.scalars().all()
    ]


class RateOverrideIn(BaseModel):
    base: str = Field(min_length=3, max_length=3)
    quote: str = Field(min_length=3, max_length=3)
    rate: float = Field(gt=0)
    source: str = "admin_override"


@router.post("/rates")
async def upsert_rate(
    payload: RateOverrideIn,
    request: Request,
    actor: User = Depends(require_roles("finance", "admin")),
    reason: str = Depends(require_admin_reason),
    db: AsyncSession = Depends(get_db),
) -> dict:
    base = payload.base.upper()
    quote = payload.quote.upper()
    res = await db.execute(select(FxRate).where(FxRate.base == base, FxRate.quote == quote))
    r = res.scalar_one_or_none()
    if r:
        old = float(r.rate)
        r.rate = payload.rate
        r.source = payload.source
        r.fetched_at = datetime.now(timezone.utc)
        diff = {"rate": [old, payload.rate]}
    else:
        r = FxRate(
            id=uuid.uuid4(),
            base=base,
            quote=quote,
            rate=payload.rate,
            source=payload.source,
            fetched_at=datetime.now(timezone.utc),
        )
        db.add(r)
        diff = {"created": [None, payload.rate]}
    await log_audit(
        db,
        actor_id=actor.id,
        actor_type="staff",
        action="fx.rate.update",
        target_type="fx_rate",
        target_id=f"{base}->{quote}",
        diff=diff,
        reason=reason,
        ip=request.client.host if request.client else None,
        request_id=request.headers.get("X-Request-Id"),
    )
    await db.commit()
    return {"ok": True, "base": base, "quote": quote, "rate": payload.rate}
