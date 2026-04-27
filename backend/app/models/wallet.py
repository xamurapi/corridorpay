import uuid
from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Wallet(Base, TimestampMixin):
    __tablename__ = "wallets"
    __table_args__ = (
        UniqueConstraint("user_id", "currency", name="uniq_wallet_user_currency"),
        CheckConstraint("balance >= 0", name="balance_non_negative"),
        CheckConstraint("blocked >= 0 AND blocked <= balance", name="blocked_within_balance"),
        CheckConstraint("char_length(currency) = 3", name="currency_iso4217_3"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    balance: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)  # minor units
    blocked: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)

    user = relationship("User", back_populates="wallets")

    @property
    def available(self) -> int:
        return self.balance - self.blocked
