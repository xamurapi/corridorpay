import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["cabinet"])


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    title: str
    body: str | None
    severity: str
    read: bool
    created_at: datetime


@router.get("", response_model=list[NotificationOut])
async def list_notifications(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[NotificationOut]:
    res = await db.execute(
        select(Notification).where(Notification.user_id == current.id).order_by(Notification.created_at.desc()).limit(50)
    )
    return [NotificationOut.model_validate(n) for n in res.scalars().all()]


@router.post("/read-all")
async def mark_all_read(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(update(Notification).where(Notification.user_id == current.id, Notification.read == False).values(read=True))  # noqa: E712
    await db.commit()
    return {"ok": True}
