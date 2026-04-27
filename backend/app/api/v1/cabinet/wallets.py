import uuid
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.wallet import WalletCreate, WalletOut

router = APIRouter(prefix="/wallets", tags=["cabinet"])

SUPPORTED = {"RUB", "INR", "CNY", "EUR", "TRY", "BYN", "UZS", "KZT", "KGS", "AMD", "AZN", "GEL", "USD"}


def _serialize(w: Wallet) -> WalletOut:
    return WalletOut(
        id=w.id, currency=w.currency, balance=w.balance, blocked=w.blocked,
        available=w.balance - w.blocked, status=w.status,
    )


@router.get("", response_model=list[WalletOut])
async def list_wallets(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[WalletOut]:
    res = await db.execute(select(Wallet).where(Wallet.user_id == current.id).order_by(Wallet.currency))
    return [_serialize(w) for w in res.scalars().all()]


@router.post("", response_model=WalletOut, status_code=201)
async def create_wallet(payload: WalletCreate, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> WalletOut:
    ccy = payload.currency.upper()
    if ccy not in SUPPORTED:
        raise errors.bad_request("wallet.unsupported_currency", f"Currency {ccy} not supported")
    res = await db.execute(select(Wallet).where(Wallet.user_id == current.id, Wallet.currency == ccy))
    if res.scalar_one_or_none():
        raise errors.conflict("wallet.exists", f"Wallet {ccy} already exists")
    w = Wallet(id=uuid.uuid4(), user_id=current.id, currency=ccy)
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return _serialize(w)
