import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class SavedListing(Base):
    __tablename__ = "saved_listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    address: Mapped[str] = mapped_column(String(500), nullable=False)

    # Property details
    bedrooms: Mapped[float | None] = mapped_column(Float)
    bathrooms: Mapped[float | None] = mapped_column(Float)
    sqft: Mapped[int | None] = mapped_column(Integer)
    lot_size: Mapped[str | None] = mapped_column(String(100))
    year_built: Mapped[int | None] = mapped_column(Integer)
    price_target: Mapped[str | None] = mapped_column(String(200))
    features: Mapped[str | None] = mapped_column(Text)
    neighborhood: Mapped[str | None] = mapped_column(Text)

    # Contact info
    seller_name: Mapped[str | None] = mapped_column(String(255))
    seller_email: Mapped[str | None] = mapped_column(String(255))
    seller_phone: Mapped[str | None] = mapped_column(String(50))
    buyer_name: Mapped[str | None] = mapped_column(String(255))
    buyer_email: Mapped[str | None] = mapped_column(String(255))
    buyer_phone: Mapped[str | None] = mapped_column(String(50))

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("tenant_id", "address", name="uq_saved_listings_tenant_address"),
    )
