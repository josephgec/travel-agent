import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Trip
from app.schemas.trips import TripOut
from app.workers.queue import enqueue_email_scan

router = APIRouter(prefix="/api/trips", tags=["trips"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=list[TripOut])
async def list_trips(db: DbSession) -> list[Trip]:
    rows = (
        await db.scalars(
            select(Trip)
            .where(Trip.kind != "other")
            .order_by(Trip.departure_date.desc().nulls_last(), Trip.created_at.desc())
        )
    ).all()
    return list(rows)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(trip_id: uuid.UUID, db: DbSession) -> None:
    trip = await db.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="trip not found")
    await db.delete(trip)
    await db.commit()


@router.post("/scan", status_code=status.HTTP_202_ACCEPTED)
async def trigger_scan() -> dict[str, str]:
    """Manually trigger the email parser background job."""
    await enqueue_email_scan()
    return {"status": "queued"}
