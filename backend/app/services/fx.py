"""FX engine: cross-rates via USD anchor, markup applied as bps off mid-rate."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core import errors
from app.models.corridor import Corridor
from app.models.fx import FxLock, FxRate

CURRENCIES = ["RUB", "INR", "CNY", "EUR", "TRY", "BYN", "UZS", "KZT", "KGS", "AMD", "AZN", "GEL", "USD"]

# Minor units multiplier (most are 100; some are 1)
MINOR = {ccy: 100 for ccy in CURRENCIES}


async def get_rate(db: AsyncSession, base: str, quote: str) -> Decimal:
    base, quote = base.upper(), quote.upper()
    if base == quote:
        return Decimal("1")
    # direct
    res = await db.execute(select(FxRate).where(FxRate.base == base, FxRate.quote == quote))
    direct = res.scalar_one_or_none()
    if direct:
        return Decimal(str(direct.rate))
    # inverse
    res = await db.execute(select(FxRate).where(FxRate.base == quote, FxRate.quote == base))
    inv = res.scalar_one_or_none()
    if inv and Decimal(str(inv.rate)) > 0:
        return (Decimal("1") / Decimal(str(inv.rate))).quantize(Decimal("0.00000001"), rounding=ROUND_HALF_UP)
    # cross via USD
    res1 = await db.execute(select(FxRate).where(FxRate.base == "USD", FxRate.quote == base))
    res2 = await db.execute(select(FxRate).where(FxRate.base == "USD", FxRate.quote == quote))
    a = res1.scalar_one_or_none()
    b = res2.scalar_one_or_none()
    if a and b and Decimal(str(a.rate)) > 0:
        return (Decimal(str(b.rate)) / Decimal(str(a.rate))).quantize(Decimal("0.00000001"), rounding=ROUND_HALF_UP)
    raise errors.bad_request("fx.rate_unavailable", f"FX rate {base}->{quote} unavailable")


async def get_corridor_for_currency(db: AsyncSession, currency: str) -> Corridor | None:
    res = await db.execute(select(Corridor).where(Corridor.currency == currency.upper()).limit(1))
    return res.scalar_one_or_none()


async def quote(
    db: AsyncSession,
    *,
    from_currency: str,
    to_currency: str,
    amount_in_minor: int | None = None,
    amount_out_minor: int | None = None,
) -> dict:
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    if amount_in_minor is None and amount_out_minor is None:
        raise errors.bad_request("fx.amount_required", "Provide amount_in_minor or amount_out_minor")
    rate = await get_rate(db, from_currency, to_currency)
    # markup from destination corridor
    dest = await get_corridor_for_currency(db, to_currency)
    src = await get_corridor_for_currency(db, from_currency)
    markup_bps = dest.fx_markup_bps if dest else (src.fx_markup_bps if src else 180)
    fee_bps = dest.base_fee_bps if dest else (src.base_fee_bps if src else 30)
    rate_lock_ttl = dest.rate_lock_ttl_sec if dest else settings.FX_LOCK_TTL_SEC

    # client-effective rate: rate * (1 - markup/10000)
    eff = rate * (Decimal(10_000 - markup_bps) / Decimal(10_000))

    if amount_in_minor is not None:
        amt_in = Decimal(amount_in_minor) / Decimal(MINOR[from_currency])
        amt_out = (amt_in * eff).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        amt_out_minor = int(amt_out * MINOR[to_currency])
        amt_in_minor = amount_in_minor
    else:
        amt_out = Decimal(amount_out_minor) / Decimal(MINOR[to_currency])
        amt_in = (amt_out / eff).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        amt_in_minor = int(amt_in * MINOR[from_currency])
        amt_out_minor = amount_out_minor

    fee_minor = int(Decimal(amt_in_minor) * Decimal(fee_bps) / Decimal(10_000))
    return {
        "from_currency": from_currency,
        "to_currency": to_currency,
        "amount_in_minor": amt_in_minor,
        "amount_out_minor": amt_out_minor,
        "fee_minor": fee_minor,
        "fx_rate": float(rate),
        "fx_rate_effective": float(eff),
        "markup_bps": markup_bps,
        "fee_bps": fee_bps,
        "rate_lock_ttl_sec": rate_lock_ttl,
    }


async def lock_quote(db: AsyncSession, *, user_id: uuid.UUID | None, q: dict) -> FxLock:
    expires = datetime.now(timezone.utc) + timedelta(seconds=q["rate_lock_ttl_sec"])
    lock = FxLock(
        id=uuid.uuid4(),
        user_id=user_id,
        from_currency=q["from_currency"],
        to_currency=q["to_currency"],
        amount_in_minor=q["amount_in_minor"],
        amount_out_minor=q["amount_out_minor"],
        fx_rate=q["fx_rate_effective"],
        markup_bps=q["markup_bps"],
        fee_minor=q["fee_minor"],
        expires_at=expires,
    )
    db.add(lock)
    await db.flush()
    return lock
