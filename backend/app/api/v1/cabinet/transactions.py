import uuid
from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, Header, Query, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.transaction import Transaction, TxStatusHistory
from app.models.user import User
from app.services.transactions import create_transfer

router = APIRouter(prefix="/transactions", tags=["cabinet"])


class TxOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: str
    status: str
    from_currency: str
    to_currency: str
    amount_in_minor: int
    amount_out_minor: int
    fee_minor: int
    fx_rate_locked: float | None
    purpose_code: str | None
    recipient_snapshot: dict
    created_at: datetime
    completed_at: datetime | None


class TxStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str
    note: str | None
    actor_type: str
    created_at: datetime


class TxDetailOut(TxOut):
    timeline: list[TxStatusOut]


class TxList(BaseModel):
    items: list[TxOut]
    total: int


class CreateTransferIn(BaseModel):
    recipient_id: uuid.UUID | None = None
    fx_lock_id: uuid.UUID | None = None
    from_currency: str | None = None
    to_currency: str | None = None
    amount_in_minor: int | None = None
    amount_out_minor: int | None = None
    purpose_code: str | None = None


@router.get("", response_model=TxList)
async def list_tx(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = None,
) -> TxList:
    q = select(Transaction).where(Transaction.user_id == current.id).order_by(Transaction.created_at.desc())
    if status:
        q = q.where(Transaction.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    res = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    items = [TxOut.model_validate(t) for t in res.scalars().all()]
    return TxList(items=items, total=total)


@router.get("/{tx_id}", response_model=TxDetailOut)
async def get_tx(tx_id: uuid.UUID, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> TxDetailOut:
    res = await db.execute(select(Transaction).where(Transaction.id == tx_id, Transaction.user_id == current.id))
    tx = res.scalar_one_or_none()
    if not tx:
        raise errors.not_found("tx.not_found", "Transaction not found")
    res2 = await db.execute(
        select(TxStatusHistory).where(TxStatusHistory.transaction_id == tx.id).order_by(TxStatusHistory.created_at)
    )
    timeline = [TxStatusOut.model_validate(h) for h in res2.scalars().all()]
    return TxDetailOut(**TxOut.model_validate(tx).model_dump(), timeline=timeline)


@router.post("", response_model=TxOut, status_code=201)
async def create_tx(
    payload: CreateTransferIn,
    request: Request,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TxOut:
    if not idempotency_key:
        idempotency_key = uuid.uuid4().hex
    tx = await create_transfer(
        db,
        user=current,
        idempotency_key=idempotency_key,
        recipient_id=payload.recipient_id,
        fx_lock_id=payload.fx_lock_id,
        from_currency=payload.from_currency,
        to_currency=payload.to_currency,
        amount_in_minor=payload.amount_in_minor,
        amount_out_minor=payload.amount_out_minor,
        purpose_code=payload.purpose_code,
        client_ip=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(tx)
    return TxOut.model_validate(tx)
