import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.recipient import Recipient
from app.models.user import User

router = APIRouter(prefix="/recipients", tags=["cabinet"])


class RecipientIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    country_iso2: str = Field(min_length=2, max_length=2)
    currency: str = Field(min_length=3, max_length=3)
    method: str
    identifier: str
    bank_name: str | None = None
    favorite: bool = False


class RecipientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    country_iso2: str
    currency: str
    method: str
    identifier: str
    bank_name: str | None
    favorite: bool
    created_at: datetime


@router.get("", response_model=list[RecipientOut])
async def list_recipients(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[RecipientOut]:
    res = await db.execute(
        select(Recipient).where(Recipient.user_id == current.id).order_by(Recipient.favorite.desc(), Recipient.full_name)
    )
    return [RecipientOut.model_validate(r) for r in res.scalars().all()]


@router.post("", response_model=RecipientOut, status_code=201)
async def create_recipient(payload: RecipientIn, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> RecipientOut:
    r = Recipient(
        id=uuid.uuid4(),
        user_id=current.id,
        full_name=payload.full_name,
        country_iso2=payload.country_iso2.upper(),
        currency=payload.currency.upper(),
        method=payload.method,
        identifier=payload.identifier,
        bank_name=payload.bank_name,
        favorite=payload.favorite,
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return RecipientOut.model_validate(r)


@router.delete("/{recipient_id}")
async def delete_recipient(recipient_id: uuid.UUID, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    res = await db.execute(select(Recipient).where(Recipient.id == recipient_id, Recipient.user_id == current.id))
    r = res.scalar_one_or_none()
    if not r:
        raise errors.not_found("recipient.not_found", "Recipient not found")
    await db.delete(r)
    await db.commit()
    return {"ok": True}
