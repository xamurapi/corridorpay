"""Double-entry ledger. Posts journal + balanced entries."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.models.ledger import JournalEntry, LedgerAccount, LedgerEntry


async def get_or_create_account(
    db: AsyncSession, *, code: str, kind: str, currency: str, owner_user_id: uuid.UUID | None = None
) -> LedgerAccount:
    res = await db.execute(select(LedgerAccount).where(LedgerAccount.code == code))
    acc = res.scalar_one_or_none()
    if acc:
        return acc
    acc = LedgerAccount(id=uuid.uuid4(), code=code, kind=kind, currency=currency, owner_user_id=owner_user_id)
    db.add(acc)
    await db.flush()
    return acc


async def post_journal(
    db: AsyncSession,
    *,
    transaction_id: uuid.UUID | None,
    idempotency_key: str,
    description: str,
    entries: list[dict],  # [{account_code, kind, currency, owner_user_id?, direction, amount_minor}]
    posted_by: str = "system",
) -> JournalEntry:
    # Validate balance per currency
    by_ccy: dict[str, int] = {}
    for e in entries:
        ccy = e["currency"]
        sign = 1 if e["direction"] == "debit" else -1
        by_ccy[ccy] = by_ccy.get(ccy, 0) + sign * e["amount_minor"]
    for ccy, delta in by_ccy.items():
        if delta != 0:
            raise errors.bad_request(
                "ledger.imbalance",
                f"Ledger imbalance for {ccy}: {delta}",
                details={"by_currency": by_ccy},
            )

    journal = JournalEntry(
        id=uuid.uuid4(),
        transaction_id=transaction_id,
        idempotency_key=idempotency_key,
        description=description,
        posted_at=datetime.now(timezone.utc),
        posted_by=posted_by,
    )
    db.add(journal)
    await db.flush()

    for e in entries:
        acc = await get_or_create_account(
            db,
            code=e["account_code"],
            kind=e["kind"],
            currency=e["currency"],
            owner_user_id=e.get("owner_user_id"),
        )
        db.add(
            LedgerEntry(
                id=uuid.uuid4(),
                journal_id=journal.id,
                account_id=acc.id,
                direction=e["direction"],
                amount_minor=e["amount_minor"],
                currency=e["currency"],
                posted_at=journal.posted_at,
                metadata_json=e.get("metadata", {}),
            )
        )
    await db.flush()
    return journal
