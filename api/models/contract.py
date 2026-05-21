import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    contract_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'listing_agreement' | 'buyer_broker'
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # 'draft' | 'signed'
    input_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    generated_text: Mapped[dict] = mapped_column(JSONB, nullable=False)  # Parsed sections dict
    pdf_path: Mapped[str | None] = mapped_column(Text)
    pdf_url: Mapped[str | None] = mapped_column(Text)
    parties: Mapped[list] = mapped_column(JSONB, default=list)  # signature status of parties
    signed_count: Mapped[int] = mapped_column(Integer, default=0)
    required_signatures: Mapped[int] = mapped_column(Integer, default=2)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    tenant = relationship("Tenant", back_populates="contracts")
    user = relationship("User", back_populates="contracts")
