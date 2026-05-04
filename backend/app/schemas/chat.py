import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ConversationOut(BaseModel):
    id: uuid.UUID
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationCreate(BaseModel):
    title: str | None = None


class MessageOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID
    message: str = Field(min_length=1, max_length=10_000)
