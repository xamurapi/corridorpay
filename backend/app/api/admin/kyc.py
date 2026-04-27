import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_admin_user, require_admin_reason
from app.db.session import get_db
from app.models.kyc import KycApplication
from app.models.user import User
from app.services.audit import log_audit

router = APIRouter(prefix="/kyc", tags=["admin"])


@router.get("/queue")
async def queue(_: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    res = await db.execute(
        select(KycApplication).where(KycApplication.status.in_(["pending", "review"])).order_by(KycApplication.created_at)
    )
    return [
        {
            "id": str(a.id),
            "user_id": str(a.user_id),
            "tier": a.tier,
            "status": a.status,
            "provider": a.provider,
            "created_at": a.created_at.isoformat(),
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        }
        for a in res.scalars().all()
    ]


class KycDecision(BaseModel):
    decision: str = Field(pattern="^(approve|reject|more_info)$")
    note: str | None = None


@router.post("/applications/{app_id}/decision")
async def decide(
    app_id: uuid.UUID,
    payload: KycDecision,
    request: Request,
    actor: User = Depends(get_admin_user),
    reason: str = Depends(require_admin_reason),
    db: AsyncSession = Depends(get_db),
) -> dict:
    res = await db.execute(select(KycApplication).where(KycApplication.id == app_id))
    app = res.scalar_one_or_none()
    if not app:
        raise errors.not_found("kyc.not_found", "Application not found")
    new_status = {"approve": "approved", "reject": "rejected", "more_info": "more_info"}[payload.decision]
    old_status = app.status
    app.status = new_status
    app.decision_reason = payload.note
    app.decided_at = datetime.now(timezone.utc)

    if new_status == "approved":
        ures = await db.execute(select(User).where(User.id == app.user_id))
        u = ures.scalar_one()
        if u.kyc_tier < app.tier:
            u.kyc_tier = app.tier
    await log_audit(
        db,
        actor_id=actor.id,
        actor_type="staff",
        action="kyc.decision",
        target_type="kyc_application",
        target_id=str(app.id),
        diff={"status": [old_status, new_status]},
        reason=reason,
        ip=request.client.host if request.client else None,
        request_id=request.headers.get("X-Request-Id"),
    )
    await db.commit()
    return {"ok": True, "status": new_status}
