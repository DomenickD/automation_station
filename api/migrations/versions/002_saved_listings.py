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
        sa.Column("seller_name", sa.String(255)),
        sa.Column("seller_email", sa.String(255)),
        sa.Column("seller_phone", sa.String(50)),
        sa.Column("buyer_name", sa.String(255)),
        sa.Column("buyer_email", sa.String(255)),
        sa.Column("buyer_phone", sa.String(50)),
        sa.Column("notes", sa.Text),
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
