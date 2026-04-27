import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_admin_user
from app.db.session import get_db
from app.models.transaction import Transaction, TxStatusHistory
from app.models.user import User

router = APIRouter(prefix="/transactions", tags=["admin"])


class AdminTxOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    kind: str
    status: str
    from_currency: str
    to_currency: str
    amount_in_minor: int
    amount_out_minor: int
    fee_minor: int
    purpose_code: str | None
    created_at: datetime
    completed_at: datetime | None


class AdminTxList(BaseModel):
    items: list[AdminTxOut]
    total: int


@router.get("", response_model=AdminTxList)
async def list_tx(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    status: str | None = None,
    user_id: uuid.UUID | None = None,
) -> AdminTxList:
    q = select(Transaction)
    if status:
        q = q.where(Transaction.status == status)
    if user_id:
        q = q.where(Transaction.user_id == user_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    res = await db.execute(q.order_by(Transaction.created_at.desc()).offset((page - 1) * per_page).limit(per_page))
    items = [AdminTxOut.model_validate(t) for t in res.scalars().all()]
    return AdminTxList(items=items, total=total)


@router.get("/{tx_id}")
async def get_tx(tx_id: uuid.UUID, _: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)) -> dict:
    res = await db.execute(select(Transaction).where(Transaction.id == tx_id))
    tx = res.scalar_one_or_none()
    if not tx:
        raise errors.not_found("tx.not_found", "Transaction not found")
    res2 = await db.execute(select(TxStatusHistory).where(TxStatusHistory.transaction_id == tx.id).order_by(TxStatusHistory.created_at))
    return {
        "transaction": AdminTxOut.model_validate(tx).model_dump(),
        "timeline": [
            {"status": h.status, "note": h.note, "actor_type": h.actor_type, "created_at": h.created_at.isoformat()}
            for h in res2.scalars().all()
        ],
        "recipient_snapshot": tx.recipient_snapshot,
        "metadata": tx.metadata_json,
    }
