import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditAction


async def log_audit(
    db: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    actor_type: str,
    action: str,
    target_type: str,
    target_id: str | None = None,
    diff: dict | None = None,
    reason: str | None = None,
    ip: str | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
) -> AuditAction:
    entry = AuditAction(
        id=uuid.uuid4(),
        actor_id=actor_id,
        actor_type=actor_type,
        action=action,
        target_type=target_type,
        target_id=target_id,
        diff=diff or {},
        reason=reason,
        ip=ip,
        request_id=request_id,
        user_agent=user_agent,
    )
    db.add(entry)
    await db.flush()
    return entry
