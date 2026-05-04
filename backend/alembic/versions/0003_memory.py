"""preferences and memories with HNSW index

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-03 00:00:02

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EMBEDDING_DIM = 1024


def upgrade() -> None:
    op.create_table(
        "preferences",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(120), nullable=False),
        sa.Column("value", JSONB, nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("key", name="uq_preferences_key"),
    )

    op.create_table(
        "memories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=False),
        sa.Column(
            "source_message_id",
            UUID(as_uuid=True),
            sa.ForeignKey("messages.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("importance", sa.Integer, nullable=False, server_default="3"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    # HNSW index with cosine distance — works well for ad-hoc semantic search at this scale.
    op.execute(
        "CREATE INDEX ix_memories_embedding_hnsw ON memories "
        "USING hnsw (embedding vector_cosine_ops)"
    )
    op.create_index("ix_memories_kind", "memories", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_memories_kind", table_name="memories")
    op.execute("DROP INDEX IF EXISTS ix_memories_embedding_hnsw")
    op.drop_table("memories")
    op.drop_table("preferences")
