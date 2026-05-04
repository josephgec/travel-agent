import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PreferenceOut(BaseModel):
    id: uuid.UUID
    key: str
    value: Any
    updated_at: datetime

    model_config = {"from_attributes": True}


class PreferenceUpsert(BaseModel):
    key: str = Field(min_length=1, max_length=120)
    value: Any


class MemoryOut(BaseModel):
    id: uuid.UUID
    kind: str
    title: str
    content: str
    importance: int
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}
