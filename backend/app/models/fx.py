import uuid
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class FxRate(Base, TimestampMixin):
    """Mid-market rate from CB source. base→quote, e.g. USD→RUB."""
    __tablename__ = "fx_rates"
    __table_args__ = (
        UniqueConstraint("base", "quote", name="uniq_fx_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    base: Mapped[str] = mapped_column(String(3), index=True, nullable=False)
    quote: Mapped[str] = mapped_column(String(3), index=True, nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="ECB", nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class FxLock(Base, TimestampMixin):
    """Locked rate for a quote. TTL = corridor.rate_lock_ttl_sec."""
    __tablename__ = "fx_locks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)

    from_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    to_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    amount_in_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    amount_out_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    fx_rate: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    markup_bps: Mapped[int] = mapped_column(Integer, default=180, nullable=False)
    fee_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(default=False, nullable=False)
