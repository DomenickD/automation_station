"""contracts table

Revision ID: 003
Revises: 002
Create Date: 2026-05-21

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
