"""master schema

Revision ID: 001
Revises:
Create Date: 2026-05-23

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Tenants ───────────────────────────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("vertical", sa.String(50), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("api_key", sa.Text),
        sa.Column("brand_color", sa.String(20), server_default="#2563eb"),
        sa.Column("logo_url", sa.Text),
        sa.Column("system_prompt_override", sa.Text),
        sa.Column("monthly_token_limit", sa.Integer, server_default="500000"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255)),
        sa.Column("role", sa.String(20), server_default="user"),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )

    # ── Generated Documents ───────────────────────────────────────────────────
    op.create_table(
        "generated_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("input_data", postgresql.JSONB, nullable=False),
        sa.Column("output_text", sa.Text, nullable=False),
        sa.Column("model", sa.String(100), server_default="claude-sonnet-4-6"),
        sa.Column("tokens_used", sa.Integer),
        sa.Column("version", sa.Integer, server_default="1"),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("generated_documents.id")),
        sa.Column("saved_listing_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_generated_documents_tenant_id", "generated_documents", ["tenant_id"])
    op.create_index("ix_generated_documents_module", "generated_documents", ["module"])

    # ── Bot Configs ───────────────────────────────────────────────────────────
    op.create_table(
        "bot_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("context_data", postgresql.JSONB, nullable=False),
        sa.Column("system_prompt", sa.Text),
        sa.Column("embed_token", sa.String(64), unique=True, nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Chat Sessions ─────────────────────────────────────────────────────────
    op.create_table(
        "chat_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bot_config_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bot_configs.id")),
        sa.Column("session_token", sa.String(64), unique=True, nullable=False),
        sa.Column("visitor_name", sa.String(255)),
        sa.Column("visitor_email", sa.String(255)),
        sa.Column("visitor_phone", sa.String(50)),
        sa.Column("messages", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("lead_captured", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_chat_sessions_tenant_id", "chat_sessions", ["tenant_id"])

    # ── Knowledge Documents ───────────────────────────────────────────────────
    op.create_table(
        "knowledge_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(255)),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("chunk_index", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Usage Events ──────────────────────────────────────────────────────────
    op.create_table(
        "usage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("module", sa.String(50)),
        sa.Column("tokens_used", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_usage_events_tenant_id", "usage_events", ["tenant_id"])
    op.create_index("ix_usage_events_created_at", "usage_events", ["created_at"])

    # ── Saved Listings ────────────────────────────────────────────────────────
    op.create_table(
        "saved_listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("address", sa.String(500), nullable=False),
        # Core property details
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
        # Listing logistics
        sa.Column("list_price", sa.String(100)),
        sa.Column("target_buyer", sa.String(255)),
        sa.Column("listing_status", sa.String(100)),
        sa.Column("mls_number", sa.String(100)),
        # Location
        sa.Column("city", sa.String(150)),
        sa.Column("state", sa.String(50)),
        sa.Column("zip_code", sa.String(20)),
        sa.Column("county", sa.String(150)),
        # Showing / logistics
        sa.Column("showing_instructions", sa.Text),
        sa.Column("open_house", sa.Text),
        sa.Column("closing_pref", sa.Text),
        sa.Column("inclusions", sa.Text),
        sa.Column("exclusions", sa.Text),
        sa.Column("lockbox", sa.String(100)),
        sa.Column("mls_auth", sa.String(100)),
        # HOA & due diligence
        sa.Column("hoa", sa.String(100)),
        sa.Column("hoa_fee", sa.String(100)),
        sa.Column("hoa_covers", sa.Text),
        sa.Column("schools", sa.Text),
        sa.Column("flood_zone", sa.String(100)),
        sa.Column("utilities", sa.Text),
        sa.Column("updates", sa.Text),
        sa.Column("property_details", sa.Text),
        # Market & pricing
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
        # Marketing
        sa.Column("headline_feature", sa.Text),
        sa.Column("ig_handle", sa.String(100)),
        # Contract context
        sa.Column("seller_names", sa.Text),
        sa.Column("buyer_names", sa.Text),
        sa.Column("start_date", sa.String(50)),
        sa.Column("end_date", sa.String(50)),
        sa.Column("commission", sa.String(100)),
        sa.Column("buyer_commission", sa.String(100)),
        sa.Column("special_terms", sa.Text),
        # Contact info
        sa.Column("seller_name", sa.String(255)),
        sa.Column("seller_email", sa.String(255)),
        sa.Column("seller_phone", sa.String(50)),
        sa.Column("buyer_name", sa.String(255)),
        sa.Column("buyer_email", sa.String(255)),
        sa.Column("buyer_phone", sa.String(50)),
        # Notes & metadata
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

    # Link generated_documents → saved_listings (FK added after saved_listings exists)
    op.create_foreign_key(
        "fk_generated_documents_saved_listing_id",
        "generated_documents", "saved_listings",
        ["saved_listing_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_generated_documents_saved_listing_id", "generated_documents", ["saved_listing_id"])

    # ── Contracts ─────────────────────────────────────────────────────────────
    op.create_table(
        "contracts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("contract_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("input_data", postgresql.JSONB, nullable=False),
        sa.Column("generated_text", postgresql.JSONB, nullable=False),
        sa.Column("pdf_path", sa.Text),
        sa.Column("pdf_url", sa.Text),
        sa.Column("parties", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("signed_count", sa.Integer, server_default="0"),
        sa.Column("required_signatures", sa.Integer, server_default="2"),
        sa.Column("tokens_used", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_contracts_tenant_id", "contracts", ["tenant_id"])
    op.create_index("ix_contracts_status", "contracts", ["tenant_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_contracts_status", "contracts")
    op.drop_index("ix_contracts_tenant_id", "contracts")
    op.drop_table("contracts")

    op.execute("DROP INDEX IF EXISTS ix_saved_listings_tenant_address")
    op.drop_index("ix_saved_listings_tenant_id", "saved_listings")
    op.drop_table("saved_listings")

    op.drop_index("ix_usage_events_created_at", "usage_events")
    op.drop_index("ix_usage_events_tenant_id", "usage_events")
    op.drop_table("usage_events")

    op.drop_table("knowledge_documents")

    op.drop_index("ix_chat_sessions_tenant_id", "chat_sessions")
    op.drop_table("chat_sessions")

    op.drop_table("bot_configs")

    op.drop_index("ix_generated_documents_module", "generated_documents")
    op.drop_index("ix_generated_documents_tenant_id", "generated_documents")
    op.drop_index("ix_generated_documents_saved_listing_id", "generated_documents")
    op.drop_constraint("fk_generated_documents_saved_listing_id", "generated_documents", type_="foreignkey")
    op.drop_table("generated_documents")

    op.drop_table("users")
    op.drop_table("tenants")
