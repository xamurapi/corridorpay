import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class KycApplication(Base, TimestampMixin):
    __tablename__ = "kyc_applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    tier: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True, nullable=False)
    # pending | review | approved | rejected | more_info
    provider: Mapped[str] = mapped_column(String(32), default="manual", nullable=False)
    provider_application_id: Mapped[str | None] = mapped_column(String(120))
    decision_reason: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)


class KycDocument(Base, TimestampMixin):
    __tablename__ = "kyc_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("kyc_applications.id", ondelete="CASCADE"), index=True, nullable=False)
    doc_type: Mapped[str] = mapped_column(String(40), nullable=False)
    # passport | id_card | selfie | proof_of_address | bank_statement | incorporation
    file_name: Mapped[str] = mapped_column(String(200), nullable=False)
    s3_key: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(24), default="uploaded", nullable=False)
