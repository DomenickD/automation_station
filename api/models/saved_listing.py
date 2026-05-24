import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
    property_type: Mapped[str | None] = mapped_column(String(100))
    property_style: Mapped[str | None] = mapped_column(String(100))
    condition: Mapped[str | None] = mapped_column(String(100))
    garage: Mapped[str | None] = mapped_column(String(100))
    list_price: Mapped[str | None] = mapped_column(String(100))
    target_buyer: Mapped[str | None] = mapped_column(String(255))
    listing_status: Mapped[str | None] = mapped_column(String(100))
    mls_number: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str | None] = mapped_column(String(150))
    state: Mapped[str | None] = mapped_column(String(50))
    zip_code: Mapped[str | None] = mapped_column(String(20))
    county: Mapped[str | None] = mapped_column(String(150))

    # Showing, listing logistics, and seller terms
    showing_instructions: Mapped[str | None] = mapped_column(Text)
    open_house: Mapped[str | None] = mapped_column(Text)
    closing_pref: Mapped[str | None] = mapped_column(Text)
    inclusions: Mapped[str | None] = mapped_column(Text)
    exclusions: Mapped[str | None] = mapped_column(Text)
    lockbox: Mapped[str | None] = mapped_column(String(100))
    mls_auth: Mapped[str | None] = mapped_column(String(100))

    # Neighborhood, financials, and due-diligence details
    hoa: Mapped[str | None] = mapped_column(String(100))
    hoa_fee: Mapped[str | None] = mapped_column(String(100))
    hoa_covers: Mapped[str | None] = mapped_column(Text)
    schools: Mapped[str | None] = mapped_column(Text)
    flood_zone: Mapped[str | None] = mapped_column(String(100))
    utilities: Mapped[str | None] = mapped_column(Text)
    updates: Mapped[str | None] = mapped_column(Text)
    property_details: Mapped[str | None] = mapped_column(Text)

    # Market/CMA and pricing context
    market_notes: Mapped[str | None] = mapped_column(Text)
    comparables: Mapped[str | None] = mapped_column(Text)
    competitors: Mapped[str | None] = mapped_column(Text)
    current_price: Mapped[str | None] = mapped_column(String(100))
    recommended_price: Mapped[str | None] = mapped_column(String(100))
    value_range: Mapped[str | None] = mapped_column(String(200))
    dom: Mapped[int | None] = mapped_column(Integer)
    showings: Mapped[int | None] = mapped_column(Integer)
    offers: Mapped[str | None] = mapped_column(Text)
    feedback: Mapped[str | None] = mapped_column(Text)
    headline_feature: Mapped[str | None] = mapped_column(Text)
    ig_handle: Mapped[str | None] = mapped_column(String(100))

    # Contract/listing agreement context
    seller_names: Mapped[str | None] = mapped_column(Text)
    buyer_names: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[str | None] = mapped_column(String(50))
    end_date: Mapped[str | None] = mapped_column(String(50))
    commission: Mapped[str | None] = mapped_column(String(100))
    buyer_commission: Mapped[str | None] = mapped_column(String(100))
    special_terms: Mapped[str | None] = mapped_column(Text)

    # Contact info
    seller_name: Mapped[str | None] = mapped_column(String(255))
    seller_email: Mapped[str | None] = mapped_column(String(255))
    seller_phone: Mapped[str | None] = mapped_column(String(50))
    buyer_name: Mapped[str | None] = mapped_column(String(255))
    buyer_email: Mapped[str | None] = mapped_column(String(255))
    buyer_phone: Mapped[str | None] = mapped_column(String(50))

    notes: Mapped[str | None] = mapped_column(Text)
    agent_notes: Mapped[str | None] = mapped_column(Text)
    raw_context: Mapped[str | None] = mapped_column(Text)
    last_module: Mapped[str | None] = mapped_column(String(100))
    last_input_data: Mapped[dict | None] = mapped_column(JSONB)
    data_enriched: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant")
    user = relationship("User")
    documents = relationship("GeneratedDocument", back_populates="saved_listing", order_by="desc(GeneratedDocument.created_at)")

    __table_args__ = (
        UniqueConstraint("tenant_id", "address", name="uq_saved_listings_tenant_address"),
    )
