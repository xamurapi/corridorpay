from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_admin_user
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["admin"])


@router.get("")
async def list_audit(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    action: str | None = None,
    target_type: str | None = None,
) -> dict:
    q = select(AuditAction)
    if action:
        q = q.where(AuditAction.action == action)
    if target_type:
        q = q.where(AuditAction.target_type == target_type)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    res = await db.execute(q.order_by(AuditAction.created_at.desc()).offset((page - 1) * per_page).limit(per_page))
    return {
        "total": total,
        "items": [
            {
                "id": str(a.id),
                "actor_id": str(a.actor_id) if a.actor_id else None,
                "actor_type": a.actor_type,
                "action": a.action,
                "target_type": a.target_type,
                "target_id": a.target_id,
                "diff": a.diff,
                "reason": a.reason,
                "ip": a.ip,
                "created_at": a.created_at.isoformat(),
            }
            for a in res.scalars().all()
        ],
    }
