import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Trip(Base):
    """A travel reservation, parsed from email or saved manually."""

    __tablename__ = "trips"
    __table_args__ = (UniqueConstraint("source_ref", name="uq_trips_source_ref"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 'email_parser' | 'manual'
    source: Mapped[str] = mapped_column(String(40), nullable=False, default="manual")
    # Provider-specific reference for dedup. For Gmail: the message id.
    source_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # 'flight' | 'hotel' | 'rental' | 'other'
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="other")

    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    origin: Mapped[str | None] = mapped_column(String(80), nullable=True)
    destination: Mapped[str | None] = mapped_column(String(80), nullable=True)
    departure_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    confirmation_numbers: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    raw_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
