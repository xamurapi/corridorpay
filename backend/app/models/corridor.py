import uuid
from sqlalchemy import BigInteger, Boolean, Integer, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Corridor(Base, TimestampMixin):
    """Country/currency endpoint (12 in MVP). Pair-level limits stored in metadata."""
    __tablename__ = "corridors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(2), unique=True, index=True, nullable=False)  # RU, IN, CN...
    country_name_ru: Mapped[str] = mapped_column(String(80), nullable=False)
    country_name_en: Mapped[str] = mapped_column(String(80), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    currency_symbol: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    flag: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    rail: Mapped[str] = mapped_column(String(40), default="", nullable=False)  # СБП, UPI, ...
    primary_psp: Mapped[str] = mapped_column(String(40), default="", nullable=False)

    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    min_amount_minor: Mapped[int] = mapped_column(BigInteger, default=100_00, nullable=False)
    max_amount_minor: Mapped[int] = mapped_column(BigInteger, default=10_000_000_00, nullable=False)
    daily_limit_minor: Mapped[int] = mapped_column(BigInteger, default=100_000_000_00, nullable=False)

    base_fee_bps: Mapped[int] = mapped_column(Integer, default=30, nullable=False)  # 0.30%
    fx_markup_bps: Mapped[int] = mapped_column(Integer, default=180, nullable=False)  # 1.80%
    rate_lock_ttl_sec: Mapped[int] = mapped_column(Integer, default=300, nullable=False)

    settings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)


class PSPProvider(Base, TimestampMixin):
    __tablename__ = "psp_providers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)  # yookassa, cashfree...
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), index=True, nullable=False)
    capabilities: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)  # {inbound, outbound, refund}
    weight: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    health_status: Mapped[str] = mapped_column(String(16), default="healthy", nullable=False)  # healthy | degraded | down
    success_rate_pct: Mapped[int] = mapped_column(Integer, default=99, nullable=False)
    avg_latency_ms: Mapped[int] = mapped_column(Integer, default=400, nullable=False)
