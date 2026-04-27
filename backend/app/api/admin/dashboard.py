from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_admin_user
from app.db.session import get_db
from app.models.kyc import KycApplication
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["admin"])


@router.get("")
async def dashboard(_: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    new_users_24h = (await db.execute(select(func.count()).select_from(User).where(User.created_at >= since))).scalar_one()

    tx_total_24h = (await db.execute(
        select(func.count()).select_from(Transaction).where(Transaction.created_at >= since)
    )).scalar_one()
    tx_completed_24h = (await db.execute(
        select(func.count()).select_from(Transaction).where(Transaction.created_at >= since, Transaction.status == "completed")
    )).scalar_one()
    gmv_24h = (await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_in_minor), 0))
        .where(Transaction.created_at >= since, Transaction.status == "completed")
    )).scalar_one()
    fees_24h = (await db.execute(
        select(func.coalesce(func.sum(Transaction.fee_minor), 0))
        .where(Transaction.created_at >= since, Transaction.status == "completed")
    )).scalar_one()

    active_tx = (await db.execute(
        select(func.count()).select_from(Transaction).where(Transaction.status.notin_(["completed", "rejected", "failed", "cancelled", "refunded", "expired"]))
    )).scalar_one()

    kyc_queue_depth = (await db.execute(
        select(func.count()).select_from(KycApplication).where(KycApplication.status.in_(["pending", "review"]))
    )).scalar_one()

    success_rate = round((tx_completed_24h / tx_total_24h * 100), 1) if tx_total_24h else 100.0

    return {
        "users": {"total": total_users, "new_24h": new_users_24h},
        "transactions": {"count_24h": tx_total_24h, "completed_24h": tx_completed_24h, "active": active_tx, "success_rate_pct": success_rate},
        "gmv_24h_minor": int(gmv_24h or 0),
        "revenue_24h_minor": int(fees_24h or 0),
        "kyc_queue_depth": kyc_queue_depth,
    }
