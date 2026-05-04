import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel


class TripOut(BaseModel):
    id: uuid.UUID
    source: str
    source_ref: str | None
    kind: str
    title: str | None
    origin: str | None
    destination: str | None
    departure_date: date | None
    return_date: date | None
    confirmation_numbers: list[Any]
    extra: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
