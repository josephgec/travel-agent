"""Google Calendar tools — read availability, list upcoming travel, create events."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.integrations.google_calendar import (
    CalendarError,
    create_event,
    free_busy,
    list_events,
    summarize_event,
)
from app.integrations.google_oauth import OAuthError

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


CHECK_AVAILABILITY_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "check_availability",
        "description": (
            "Check the user's Google Calendar for busy slots between two timestamps. "
            "Returns a list of busy intervals; gaps between them are free."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "start": {
                    "type": "string",
                    "description": "ISO 8601 start, e.g. 2026-12-15T00:00:00-08:00",
                },
                "end": {
                    "type": "string",
                    "description": "ISO 8601 end, e.g. 2026-12-22T23:59:59-08:00",
                },
                "time_zone": {
                    "type": "string",
                    "description": "Optional IANA TZ to interpret the times in (e.g. America/Los_Angeles)",
                },
            },
            "required": ["start", "end"],
        },
    },
}


CREATE_EVENT_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "create_calendar_event",
        "description": (
            "Create a NEW event on the user's primary calendar. "
            "IMPORTANT: This writes to the user's calendar. Confirm intent with the user "
            "in plain English (title, date, location) BEFORE calling this tool the first "
            "time in a conversation. After the user confirms, you can call it directly "
            "for related follow-up events without re-asking."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {"type": "string", "description": "Event title"},
                "start": {
                    "type": "string",
                    "description": "ISO 8601 start datetime, OR YYYY-MM-DD if all_day",
                },
                "end": {
                    "type": "string",
                    "description": "ISO 8601 end datetime, OR YYYY-MM-DD if all_day (exclusive)",
                },
                "time_zone": {
                    "type": "string",
                    "description": "Optional IANA TZ when start/end have no offset",
                },
                "all_day": {
                    "type": "boolean",
                    "description": "Set true for all-day events; pass dates not datetimes",
                },
                "location": {"type": "string"},
                "description": {"type": "string"},
                "attendees": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of attendee email addresses",
                },
            },
            "required": ["summary", "start", "end"],
        },
    },
}


LIST_TRIPS_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "list_upcoming_trips_on_calendar",
        "description": (
            "List travel-tagged events on the user's calendar in a date range. "
            "Searches for keywords like 'flight', 'trip', 'hotel', 'itinerary'."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "time_min": {"type": "string", "description": "ISO 8601 lower bound"},
                "time_max": {"type": "string", "description": "ISO 8601 upper bound"},
                "max_results": {"type": "integer"},
            },
            "required": ["time_min", "time_max"],
        },
    },
}


async def check_availability_execute(
    args: dict[str, Any], ctx: "ToolContext"
) -> dict[str, Any]:
    start = (args.get("start") or "").strip()
    end = (args.get("end") or "").strip()
    if not (start and end):
        return {"error": "start and end are required"}
    try:
        busy = await free_busy(
            ctx.http,
            ctx.db,
            time_min=start,
            time_max=end,
            time_zone=args.get("time_zone"),
        )
    except (CalendarError, OAuthError) as e:
        return {"error": str(e)}
    return {"start": start, "end": end, "busy": busy}


async def create_event_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    summary = (args.get("summary") or "").strip()
    start = (args.get("start") or "").strip()
    end = (args.get("end") or "").strip()
    if not (summary and start and end):
        return {"error": "summary, start, and end are required"}
    try:
        ev = await create_event(
            ctx.http,
            ctx.db,
            summary=summary,
            start=start,
            end=end,
            time_zone=args.get("time_zone"),
            location=args.get("location"),
            description=args.get("description"),
            attendees=args.get("attendees"),
            all_day=bool(args.get("all_day", False)),
        )
    except (CalendarError, OAuthError) as e:
        return {"error": str(e)}
    return {"display_hint": "calendar_event_created", **summarize_event(ev)}


async def list_trips_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    time_min = (args.get("time_min") or "").strip()
    time_max = (args.get("time_max") or "").strip()
    if not (time_min and time_max):
        return {"error": "time_min and time_max are required"}
    max_results = int(args.get("max_results", 25))
    keywords = ["flight", "trip", "hotel", "itinerary", "reservation"]
    seen: dict[str, dict[str, Any]] = {}
    try:
        for q in keywords:
            events = await list_events(
                ctx.http,
                ctx.db,
                time_min=time_min,
                time_max=time_max,
                q=q,
                max_results=max_results,
            )
            for ev in events:
                if ev.get("id") and ev["id"] not in seen:
                    seen[ev["id"]] = ev
    except (CalendarError, OAuthError) as e:
        return {"error": str(e)}
    summaries = sorted(
        (summarize_event(ev) for ev in seen.values()),
        key=lambda s: s.get("start") or "",
    )
    return {
        "display_hint": "calendar_events",
        "time_min": time_min,
        "time_max": time_max,
        "events": summaries,
    }
