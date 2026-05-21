"""saved listings

Revision ID: 002
Revises: 001
Create Date: 2026-05-19

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saved_listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("bedrooms", sa.Float),
        sa.Column("bathrooms", sa.Float),
        sa.Column("sqft", sa.Integer),
        sa.Column("lot_size", sa.String(100)),
        sa.Column("year_built", sa.Integer),
        sa.Column("price_target", sa.String(200)),
        sa.Column("features", sa.Text),
        sa.Column("neighborhood", sa.Text),
        sa.Column("property_type", sa.String(100)),
        sa.Column("property_style", sa.String(100)),
        sa.Column("condition", sa.String(100)),
        sa.Column("garage", sa.String(100)),
        sa.Column("list_price", sa.String(100)),
        sa.Column("target_buyer", sa.String(255)),
        sa.Column("listing_status", sa.String(100)),
        sa.Column("mls_number", sa.String(100)),
        sa.Column("city", sa.String(150)),
        sa.Column("state", sa.String(50)),
        sa.Column("zip_code", sa.String(20)),
        sa.Column("county", sa.String(150)),
        sa.Column("showing_instructions", sa.Text),
        sa.Column("open_house", sa.Text),
        sa.Column("closing_pref", sa.Text),
        sa.Column("inclusions", sa.Text),
        sa.Column("exclusions", sa.Text),
        sa.Column("lockbox", sa.String(100)),
        sa.Column("mls_auth", sa.String(100)),
        sa.Column("hoa", sa.String(100)),
        sa.Column("hoa_fee", sa.String(100)),
        sa.Column("hoa_covers", sa.Text),
        sa.Column("schools", sa.Text),
        sa.Column("flood_zone", sa.String(100)),
        sa.Column("utilities", sa.Text),
        sa.Column("updates", sa.Text),
        sa.Column("property_details", sa.Text),
        sa.Column("market_notes", sa.Text),
        sa.Column("comparables", sa.Text),
        sa.Column("competitors", sa.Text),
        sa.Column("current_price", sa.String(100)),
        sa.Column("recommended_price", sa.String(100)),
        sa.Column("value_range", sa.String(200)),
        sa.Column("dom", sa.Integer),
        sa.Column("showings", sa.Integer),
        sa.Column("offers", sa.Text),
        sa.Column("feedback", sa.Text),
        sa.Column("headline_feature", sa.Text),
        sa.Column("ig_handle", sa.String(100)),
        sa.Column("seller_names", sa.Text),
        sa.Column("buyer_names", sa.Text),
        sa.Column("start_date", sa.String(50)),
        sa.Column("end_date", sa.String(50)),
        sa.Column("commission", sa.String(100)),
        sa.Column("buyer_commission", sa.String(100)),
        sa.Column("special_terms", sa.Text),
        sa.Column("seller_name", sa.String(255)),
        sa.Column("seller_email", sa.String(255)),
        sa.Column("seller_phone", sa.String(50)),
        sa.Column("buyer_name", sa.String(255)),
        sa.Column("buyer_email", sa.String(255)),
        sa.Column("buyer_phone", sa.String(50)),
        sa.Column("notes", sa.Text),
        sa.Column("agent_notes", sa.Text),
        sa.Column("raw_context", sa.Text),
        sa.Column("last_module", sa.String(100)),
        sa.Column("last_input_data", postgresql.JSONB),
        sa.Column("data_enriched", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("ix_saved_listings_tenant_id", "saved_listings", ["tenant_id"])
    op.execute(
        "CREATE UNIQUE INDEX ix_saved_listings_tenant_address "
        "ON saved_listings (tenant_id, lower(address))"
    )


def downgrade() -> None:
    op.drop_index("ix_saved_listings_tenant_address", "saved_listings")
    op.drop_index("ix_saved_listings_tenant_id", "saved_listings")
    op.drop_table("saved_listings")
