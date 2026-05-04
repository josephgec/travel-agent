import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class OAuthAccount(Base):
    """Single-user OAuth credentials per provider.

    `refresh_token_encrypted` holds the encrypted refresh token; never log decrypted.
    `scopes` is the list of scopes the user granted (subset of what we requested).
    """

    __tablename__ = "oauth_accounts"
    __table_args__ = (UniqueConstraint("provider", name="uq_oauth_accounts_provider"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    account_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    refresh_token_encrypted: Mapped[str] = mapped_column(String, nullable=False)
    scopes: Mapped[list[Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
