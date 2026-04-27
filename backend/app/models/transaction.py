import uuid
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uniq_tx_idem"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # transfer | exchange | payout | refund | deposit
    status: Mapped[str] = mapped_column(String(32), default="created", index=True, nullable=False)

    corridor_code: Mapped[str | None] = mapped_column(String(8))  # IN-RU
    from_country: Mapped[str | None] = mapped_column(String(2))
    to_country: Mapped[str | None] = mapped_column(String(2))
    from_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    to_currency: Mapped[str] = mapped_column(String(3), nullable=False)

    amount_in_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    amount_out_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    fee_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    fx_rate_locked: Mapped[float | None] = mapped_column(Numeric(20, 8))
    fx_lock_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("fx_locks.id", ondelete="SET NULL"))

    recipient_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("recipients.id", ondelete="SET NULL"))
    recipient_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    purpose_code: Mapped[str | None] = mapped_column(String(40))

    source_psp: Mapped[str | None] = mapped_column(String(40))
    payout_psp: Mapped[str | None] = mapped_column(String(40))
    external_in_id: Mapped[str | None] = mapped_column(String(120), index=True)
    external_out_id: Mapped[str | None] = mapped_column(String(120), index=True)

    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False)
    client_ip: Mapped[str | None] = mapped_column(String(64))
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text)

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TxStatusHistory(Base, TimestampMixin):
    __tablename__ = "tx_status_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    actor_type: Mapped[str] = mapped_column(String(16), default="system", nullable=False)  # user | staff | system
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
