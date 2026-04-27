from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.corridor import Corridor
from app.models.fx import FxRate
from app.services.fx import quote as quote_service

router = APIRouter()


@router.get("/corridors")
async def list_corridors(db: AsyncSession = Depends(get_db)) -> list[dict]:
    res = await db.execute(select(Corridor).where(Corridor.enabled == True).order_by(Corridor.code))  # noqa: E712
    out = []
    for c in res.scalars().all():
        out.append(
            {
                "code": c.code,
                "country_name_ru": c.country_name_ru,
                "country_name_en": c.country_name_en,
                "currency": c.currency,
                "currency_symbol": c.currency_symbol,
                "flag": c.flag,
                "rail": c.rail,
                "primary_psp": c.primary_psp,
                "min_amount_minor": c.min_amount_minor,
                "max_amount_minor": c.max_amount_minor,
                "base_fee_bps": c.base_fee_bps,
                "fx_markup_bps": c.fx_markup_bps,
                "rate_lock_ttl_sec": c.rate_lock_ttl_sec,
            }
        )
    return out


@router.get("/fx-rates")
async def fx_rates(db: AsyncSession = Depends(get_db)) -> list[dict]:
    res = await db.execute(select(FxRate))
    return [
        {"base": r.base, "quote": r.quote, "rate": float(r.rate), "source": r.source, "fetched_at": r.fetched_at}
        for r in res.scalars().all()
    ]


class QuoteIn(BaseModel):
    from_currency: str = Field(min_length=3, max_length=3)
    to_currency: str = Field(min_length=3, max_length=3)
    amount_in_minor: int | None = None
    amount_out_minor: int | None = None


@router.post("/quotes")
async def public_quote(payload: QuoteIn, db: AsyncSession = Depends(get_db)) -> dict:
    return await quote_service(
        db,
        from_currency=payload.from_currency,
        to_currency=payload.to_currency,
        amount_in_minor=payload.amount_in_minor,
        amount_out_minor=payload.amount_out_minor,
    )


class LeadIn(BaseModel):
    email: str
    from_currency: str
    to_currency: str
    amount_minor: int | None = None


@router.post("/lead")
async def lead(payload: LeadIn) -> dict:
    # In production: persist to leads table + send to CRM
    return {"ok": True, "message": "Lead captured"}


class ContactIn(BaseModel):
    name: str
    email: str
    message: str = Field(min_length=10)


@router.post("/contact")
async def contact(payload: ContactIn) -> dict:
    # In production: persist + email to support
    return {"ok": True, "message": "Contact request received"}
