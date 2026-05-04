"""Google Calendar REST client.

Docs: https://developers.google.com/calendar/api/v3/reference

We use REST + httpx directly rather than the official lib for the same reasons
as Gmail — fewer deps, cleanly async.
"""
from __future__ import annotations

from typing import Any

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.google_oauth import get_access_token

log = structlog.get_logger(__name__)

API_BASE = "https://www.googleapis.com/calendar/v3"


class CalendarError(Exception):
    pass


async def list_events(
    http: httpx.AsyncClient,
    db: AsyncSession,
    *,
    calendar_id: str = "primary",
    time_min: str,
    time_max: str,
    q: str | None = None,
    max_results: int = 25,
) -> list[dict[str, Any]]:
    token = await get_access_token(http, db)
    params: dict[str, Any] = {
        "timeMin": time_min,
        "timeMax": time_max,
        "singleEvents": "true",
        "orderBy": "startTime",
        "maxResults": max(1, min(250, max_results)),
    }
    if q:
        params["q"] = q
    resp = await http.get(
        f"{API_BASE}/calendars/{calendar_id}/events",
        params=params,
        headers={"Authorization": f"Bearer {token}"},
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise CalendarError(f"calendar list_events {resp.status_code}: {resp.text[:300]}")
    return resp.json().get("items", []) or []


async def free_busy(
    http: httpx.AsyncClient,
    db: AsyncSession,
    *,
    time_min: str,
    time_max: str,
    calendar_id: str = "primary",
    time_zone: str | None = None,
) -> list[dict[str, str]]:
    token = await get_access_token(http, db)
    body: dict[str, Any] = {
        "timeMin": time_min,
        "timeMax": time_max,
        "items": [{"id": calendar_id}],
    }
    if time_zone:
        body["timeZone"] = time_zone
    resp = await http.post(
        f"{API_BASE}/freeBusy",
        json=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise CalendarError(f"calendar freeBusy {resp.status_code}: {resp.text[:300]}")
    cal = (resp.json().get("calendars") or {}).get(calendar_id) or {}
    return cal.get("busy", []) or []


async def create_event(
    http: httpx.AsyncClient,
    db: AsyncSession,
    *,
    summary: str,
    start: str,
    end: str,
    time_zone: str | None = None,
    location: str | None = None,
    description: str | None = None,
    attendees: list[str] | None = None,
    all_day: bool = False,
    calendar_id: str = "primary",
) -> dict[str, Any]:
    token = await get_access_token(http, db)
    if all_day:
        # start/end are dates (YYYY-MM-DD)
        body: dict[str, Any] = {
            "summary": summary,
            "start": {"date": start},
            "end": {"date": end},
        }
    else:
        s_obj: dict[str, Any] = {"dateTime": start}
        e_obj: dict[str, Any] = {"dateTime": end}
        if time_zone:
            s_obj["timeZone"] = time_zone
            e_obj["timeZone"] = time_zone
        body = {"summary": summary, "start": s_obj, "end": e_obj}
    if location:
        body["location"] = location
    if description:
        body["description"] = description
    if attendees:
        body["attendees"] = [{"email": a} for a in attendees]

    resp = await http.post(
        f"{API_BASE}/calendars/{calendar_id}/events",
        json=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise CalendarError(f"calendar create_event {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def summarize_event(ev: dict[str, Any]) -> dict[str, Any]:
    start = ev.get("start") or {}
    end = ev.get("end") or {}
    return {
        "id": ev.get("id"),
        "summary": ev.get("summary"),
        "location": ev.get("location"),
        "description": ev.get("description"),
        "start": start.get("dateTime") or start.get("date"),
        "end": end.get("dateTime") or end.get("date"),
        "all_day": "date" in start and "dateTime" not in start,
        "html_link": ev.get("htmlLink"),
        "status": ev.get("status"),
        "attendees": [a.get("email") for a in (ev.get("attendees") or []) if a.get("email")],
    }
