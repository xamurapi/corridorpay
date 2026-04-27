"""Orchestrator-lite: creates a transaction, posts ledger, advances FSM in-memory."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.models.fx import FxLock
from app.models.recipient import Recipient
from app.models.transaction import Transaction, TxStatusHistory
from app.models.user import User
from app.models.wallet import Wallet
from app.services.fx import quote as quote_service
from app.services.ledger import post_journal


VALID_TRANSITIONS = {
    "created": {"risk_check", "rejected"},
    "risk_check": {"rate_locked", "rejected", "held_for_review"},
    "rate_locked": {"routed", "failed"},
    "routed": {"psp_initiated", "failed"},
    "psp_initiated": {"psp_confirmed", "failed"},
    "psp_confirmed": {"ledger_posted"},
    "ledger_posted": {"payout_initiated", "completed"},
    "payout_initiated": {"payout_completed", "failed"},
    "payout_completed": {"completed"},
    "held_for_review": {"rate_locked", "rejected", "cancelled"},
}
FINAL = {"completed", "rejected", "failed", "cancelled", "refunded", "expired"}


async def add_status(db: AsyncSession, tx: Transaction, status: str, *, note: str | None = None, actor_type: str = "system") -> None:
    allowed = VALID_TRANSITIONS.get(tx.status, set())
    if status not in allowed and status != tx.status:
        raise errors.bad_request("tx.invalid_transition", f"Cannot transition {tx.status} -> {status}")
    tx.status = status
    if status in FINAL:
        tx.completed_at = datetime.now(timezone.utc)
    db.add(TxStatusHistory(id=uuid.uuid4(), transaction_id=tx.id, status=status, note=note, actor_type=actor_type))


async def create_transfer(
    db: AsyncSession,
    *,
    user: User,
    idempotency_key: str,
    recipient_id: uuid.UUID | None,
    fx_lock_id: uuid.UUID | None,
    from_currency: str | None,
    to_currency: str | None,
    amount_in_minor: int | None,
    amount_out_minor: int | None,
    purpose_code: str | None,
    client_ip: str | None,
) -> Transaction:
    # Idempotency: return existing tx
    res = await db.execute(select(Transaction).where(Transaction.idempotency_key == idempotency_key))
    existing = res.scalar_one_or_none()
    if existing:
        return existing

    # Resolve recipient
    recipient: Recipient | None = None
    if recipient_id:
        rr = await db.execute(select(Recipient).where(Recipient.id == recipient_id, Recipient.user_id == user.id))
        recipient = rr.scalar_one_or_none()
        if not recipient:
            raise errors.not_found("recipient.not_found", "Recipient not found")

    # Resolve quote
    if fx_lock_id:
        rl = await db.execute(select(FxLock).where(FxLock.id == fx_lock_id, FxLock.user_id == user.id))
        lock = rl.scalar_one_or_none()
        if not lock or lock.used or lock.expires_at < datetime.now(timezone.utc):
            raise errors.bad_request("fx.lock_invalid", "FX lock invalid or expired")
        from_ccy = lock.from_currency
        to_ccy = lock.to_currency
        amt_in_minor = lock.amount_in_minor
        amt_out_minor = lock.amount_out_minor
        fee_minor = lock.fee_minor
        fx_rate = float(lock.fx_rate)
        lock.used = True
    else:
        if not (from_currency and to_currency and (amount_in_minor or amount_out_minor)):
            raise errors.bad_request("tx.missing_params", "Provide fx_lock_id or full quote params")
        q = await quote_service(
            db,
            from_currency=from_currency,
            to_currency=to_currency,
            amount_in_minor=amount_in_minor,
            amount_out_minor=amount_out_minor,
        )
        from_ccy = q["from_currency"]
        to_ccy = q["to_currency"]
        amt_in_minor = q["amount_in_minor"]
        amt_out_minor = q["amount_out_minor"]
        fee_minor = q["fee_minor"]
        fx_rate = q["fx_rate_effective"]

    # Wallet check (source) — soft, demo mode allows zero balance
    wres = await db.execute(select(Wallet).where(Wallet.user_id == user.id, Wallet.currency == from_ccy))
    src_wallet = wres.scalar_one_or_none()

    tx = Transaction(
        id=uuid.uuid4(),
        user_id=user.id,
        kind="transfer",
        status="created",
        from_country=recipient.country_iso2 if recipient else None,
        to_country=recipient.country_iso2 if recipient else None,
        from_currency=from_ccy,
        to_currency=to_ccy,
        amount_in_minor=amt_in_minor + fee_minor,
        amount_out_minor=amt_out_minor,
        fee_minor=fee_minor,
        fx_rate_locked=fx_rate,
        fx_lock_id=fx_lock_id,
        recipient_id=recipient.id if recipient else None,
        recipient_snapshot=(
            {
                "full_name": recipient.full_name,
                "country": recipient.country_iso2,
                "method": recipient.method,
                "identifier_masked": recipient.identifier[-4:].rjust(len(recipient.identifier), "*"),
            }
            if recipient
            else {}
        ),
        purpose_code=purpose_code,
        idempotency_key=idempotency_key,
        client_ip=client_ip,
    )
    db.add(tx)
    await db.flush()
    await add_status(db, tx, "created")
    await add_status(db, tx, "risk_check")
    await add_status(db, tx, "rate_locked")
    await add_status(db, tx, "routed")
    await add_status(db, tx, "psp_initiated")
    # Simulate sandbox PSP confirmation (in prod: webhook drives this)
    await add_status(db, tx, "psp_confirmed")

    # Post ledger entries (simplified: source wallet -> recipient external + fee revenue)
    user_wallet_code = f"user_wallet:{user.id}:{from_ccy}"
    fee_account = "system:fee_revenue"
    fx_pnl = "system:fx_pnl"
    ext_recipient = f"external:recipient:{tx.id}"
    psp_settle = "psp:demo:settlement"

    entries = [
        # Charge user wallet (source amount + fee)
        {"account_code": user_wallet_code, "kind": "user_wallet", "currency": from_ccy, "owner_user_id": user.id, "direction": "credit", "amount_minor": amt_in_minor + fee_minor},
        # Fee revenue
        {"account_code": f"{fee_account}:{from_ccy}", "kind": "fee_revenue", "currency": from_ccy, "direction": "debit", "amount_minor": fee_minor},
        # FX pnl pair (source)
        {"account_code": f"{fx_pnl}:{from_ccy}", "kind": "fx_pnl", "currency": from_ccy, "direction": "debit", "amount_minor": amt_in_minor},
        # FX pnl pair (dest)
        {"account_code": f"{fx_pnl}:{to_ccy}", "kind": "fx_pnl", "currency": to_ccy, "direction": "credit", "amount_minor": amt_out_minor},
        # PSP settlement (dest currency)
        {"account_code": f"{psp_settle}:{to_ccy}", "kind": "psp_settlement", "currency": to_ccy, "direction": "debit", "amount_minor": amt_out_minor},
        # External recipient
        {"account_code": f"{ext_recipient}:{to_ccy}", "kind": "external", "currency": to_ccy, "direction": "credit", "amount_minor": amt_out_minor},
    ]
    await post_journal(
        db,
        transaction_id=tx.id,
        idempotency_key=f"{idempotency_key}:tx",
        description=f"Transfer {from_ccy}->{to_ccy} #{str(tx.id)[:8]}",
        entries=entries,
    )
    await add_status(db, tx, "ledger_posted")
    await add_status(db, tx, "payout_initiated")
    await add_status(db, tx, "payout_completed")
    await add_status(db, tx, "completed")

    # Decrement source wallet (ignore if missing; demo)
    if src_wallet and src_wallet.balance >= amt_in_minor + fee_minor:
        src_wallet.balance -= amt_in_minor + fee_minor

    return tx
