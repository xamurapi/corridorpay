import uuid
from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Recipient(Base, TimestampMixin):
    __tablename__ = "recipients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    country_iso2: Mapped[str] = mapped_column(String(2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)

    method: Mapped[str] = mapped_column(String(32), nullable=False)  # upi | iban | card | phone | wallet | erip | qr
    identifier: Mapped[str] = mapped_column(String(255), nullable=False)  # masked/raw — в проде: identifier_enc
    bank_name: Mapped[str | None] = mapped_column(String(120))

    favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
