import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PlanOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID | None
    title: str
    status: str
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PlanUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    status: str | None = None
    data: dict[str, Any] | None = None
    patch: dict[str, Any] | None = None


class ExportResult(BaseModel):
    created: int
    skipped: int
    event_links: list[str]
    errors: list[str]
