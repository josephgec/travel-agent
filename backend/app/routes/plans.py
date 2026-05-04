import uuid
from datetime import datetime
from typing import Annotated, Any

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.integrations.google_calendar import CalendarError, create_event, summarize_event
from app.integrations.google_oauth import OAuthError
from app.models import Plan
from app.schemas.plans import ExportResult, PlanOut, PlanUpdate

router = APIRouter(prefix="/api/plans", tags=["plans"])
log = structlog.get_logger(__name__)

DbSession = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=list[PlanOut])
async def list_plans(db: DbSession) -> list[Plan]:
    rows = (await db.scalars(select(Plan).order_by(Plan.updated_at.desc()))).all()
    return list(rows)


@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(plan_id: uuid.UUID, db: DbSession) -> Plan:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    return plan


@router.patch("/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: uuid.UUID, body: PlanUpdate, db: DbSession) -> Plan:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")

    if body.title is not None:
        plan.title = body.title
    if body.status is not None:
        if body.status not in ("draft", "saved", "booked"):
            raise HTTPException(status_code=400, detail=f"invalid status: {body.status}")
        plan.status = body.status
    if body.data is not None:
        plan.data = body.data
    if body.patch:
        merged = dict(plan.data or {})
        for k, v in body.patch.items():
            merged[k] = v
        plan.data = merged

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(plan_id: uuid.UUID, db: DbSession) -> None:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    await db.delete(plan)
    await db.commit()


@router.post("/{plan_id}/export-to-calendar", response_model=ExportResult)
async def export_to_calendar(plan_id: uuid.UUID, db: DbSession) -> ExportResult:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    return await _export(plan, db)


async def _export(plan: Plan, db: AsyncSession) -> ExportResult:
    """Walk plan.data['days'] and create one calendar event per item with a time."""
    days: list[dict[str, Any]] = (plan.data or {}).get("days") or []
    created = 0
    skipped = 0
    links: list[str] = []
    errors: list[str] = []

    async with httpx.AsyncClient() as http:
        for day in days:
            date_str = day.get("date")
            if not date_str:
                skipped += len(day.get("items") or [])
                continue
            for item in day.get("items") or []:
                title = (item.get("title") or "").strip()
                time_str = item.get("time")
                if not title:
                    skipped += 1
                    continue
                if not time_str:
                    skipped += 1
                    continue

                try:
                    start_dt = datetime.fromisoformat(f"{date_str}T{time_str}")
                except ValueError:
                    errors.append(f"bad date/time on {date_str} {time_str}")
                    continue

                # Default 1h duration; agent can put a "duration_min" hint on item.
                duration_min = int(item.get("duration_min", 60))
                end_dt = start_dt.replace() + (start_dt - start_dt)  # placeholder
                # Compute end via raw arithmetic (fromisoformat returns naive).
                from datetime import timedelta

                end_dt = start_dt + timedelta(minutes=duration_min)

                try:
                    ev = await create_event(
                        http,
                        db,
                        summary=f"{plan.title}: {title}",
                        start=start_dt.isoformat(),
                        end=end_dt.isoformat(),
                        description=item.get("notes"),
                        location=item.get("location") or item.get("address"),
                    )
                    s = summarize_event(ev)
                    if s.get("html_link"):
                        links.append(s["html_link"])
                    created += 1
                except (CalendarError, OAuthError) as e:
                    errors.append(f"{title}: {e}")

    if created:
        plan.status = "saved"
        await db.commit()

    log.info(
        "plan exported to calendar",
        plan_id=str(plan.id),
        created=created,
        skipped=skipped,
        errors=len(errors),
    )
    return ExportResult(created=created, skipped=skipped, event_links=links, errors=errors)
