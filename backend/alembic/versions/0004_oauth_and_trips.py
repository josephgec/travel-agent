"""oauth_accounts and trips

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-03 00:00:03

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "oauth_accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("account_email", sa.String(254), nullable=True),
        sa.Column("refresh_token_encrypted", sa.String, nullable=False),
        sa.Column("scopes", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("provider", name="uq_oauth_accounts_provider"),
    )

    op.create_table(
        "trips",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(40), nullable=False, server_default="manual"),
        sa.Column("source_ref", sa.String(120), nullable=True),
        sa.Column("kind", sa.String(20), nullable=False, server_default="other"),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("origin", sa.String(80), nullable=True),
        sa.Column("destination", sa.String(80), nullable=True),
        sa.Column("departure_date", sa.Date, nullable=True),
        sa.Column("return_date", sa.Date, nullable=True),
        sa.Column("confirmation_numbers", JSONB, nullable=False, server_default="[]"),
        sa.Column("extra", JSONB, nullable=False, server_default="{}"),
        sa.Column("raw_excerpt", sa.Text, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("source_ref", name="uq_trips_source_ref"),
    )
    op.create_index("ix_trips_departure_date", "trips", ["departure_date"])


def downgrade() -> None:
    op.drop_index("ix_trips_departure_date", table_name="trips")
    op.drop_table("trips")
    op.drop_table("oauth_accounts")
