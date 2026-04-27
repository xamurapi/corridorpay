import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.support import SupportTicket
from app.models.user import User

router = APIRouter(prefix="/support", tags=["cabinet"])


class TicketIn(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=5, max_length=10_000)
    category: str = "general"


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    subject: str
    message: str
    category: str
    status: str
    priority: str
    created_at: datetime


@router.get("/tickets", response_model=list[TicketOut])
async def list_tickets(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[TicketOut]:
    res = await db.execute(
        select(SupportTicket).where(SupportTicket.user_id == current.id).order_by(SupportTicket.created_at.desc())
    )
    return [TicketOut.model_validate(t) for t in res.scalars().all()]


@router.post("/tickets", response_model=TicketOut, status_code=201)
async def create_ticket(payload: TicketIn, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> TicketOut:
    t = SupportTicket(
        id=uuid.uuid4(),
        user_id=current.id,
        subject=payload.subject,
        message=payload.message,
        category=payload.category,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return TicketOut.model_validate(t)
