from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.fx import lock_quote, quote as quote_service

router = APIRouter(prefix="/quotes", tags=["cabinet"])


class QuoteIn(BaseModel):
    from_currency: str = Field(min_length=3, max_length=3)
    to_currency: str = Field(min_length=3, max_length=3)
    amount_in_minor: int | None = None
    amount_out_minor: int | None = None


@router.post("")
async def create_quote(payload: QuoteIn, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    return await quote_service(
        db,
        from_currency=payload.from_currency,
        to_currency=payload.to_currency,
        amount_in_minor=payload.amount_in_minor,
        amount_out_minor=payload.amount_out_minor,
    )


@router.post("/lock")
async def lock(payload: QuoteIn, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    q = await quote_service(
        db,
        from_currency=payload.from_currency,
        to_currency=payload.to_currency,
        amount_in_minor=payload.amount_in_minor,
        amount_out_minor=payload.amount_out_minor,
    )
    fx_lock = await lock_quote(db, user_id=current.id, q=q)
    await db.commit()
    return {
        "lock_id": str(fx_lock.id),
        "expires_at": fx_lock.expires_at.isoformat(),
        **q,
    }
