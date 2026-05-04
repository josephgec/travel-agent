"""Daily background job: scan recent travel emails and persist Trip rows.

Uses the `cheap` Ollama model (qwen2.5:7b) for structured extraction.
Dedupes against existing trips by Gmail message id (`source_ref`).
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.llm import get_client
from app.config import get_settings
from app.integrations.gmail_client import (
    GmailError,
    extract_body,
    get_message,
    header,
    search,
)
from app.integrations.google_oauth import OAuthError, get_account
from app.models import Trip

log = structlog.get_logger(__name__)

# Gmail filter — covers most airline / hotel / OTA confirmation emails.
TRAVEL_QUERY = (
    "(category:travel OR "
    "subject:(confirmation OR itinerary OR reservation OR booking OR e-ticket OR check-in)) "
    "newer_than:30d"
)

EXTRACT_PROMPT = """You are extracting travel reservation details from one email.

Return strict JSON with this shape (real example values shown):

{
  "is_travel_reservation": true,
  "kind": "flight",
  "title": "United UA837 SFO → NRT",
  "origin": "SFO",
  "destination": "NRT",
  "departure_date": "2026-12-15",
  "return_date": "2026-12-22",
  "confirmation_numbers": ["XYZ123", "ABC987"]
}

Rules:
- "kind" is one of: "flight", "hotel", "rental" (car), "other".
- If the email is NOT a travel reservation/confirmation/itinerary, return {"is_travel_reservation": false} and nothing else.
- Dates are ISO YYYY-MM-DD. If a date is unknown, omit the field.
- Origin/destination for flights are airport codes when available; for hotels, the city.
- Output ONLY the JSON object — no prose, no fences."""


async def _extract(subject: str, body: str) -> dict[str, Any]:
    settings = get_settings()
    client = get_client()
    snippet = f"Subject: {subject}\n\n{body[:6000]}"
    resp = await client.chat(
        model=settings.ollama_model_fast,
        messages=[
            {"role": "system", "content": EXTRACT_PROMPT},
            {"role": "user", "content": snippet},
        ],
        format="json",
        stream=False,
    )
    content = ""
    if isinstance(resp, dict):
        content = (resp.get("message") or {}).get("content", "")
    elif hasattr(resp, "message"):
        content = resp.message.content
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        log.warning("email extractor returned non-JSON", preview=content[:300])
        return {"is_travel_reservation": False}


def _parse_iso_date(s: str | None) -> date | None:
    if not s or not isinstance(s, str):
        return None
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        return None


async def parse_recent_emails(db: AsyncSession) -> dict[str, int]:
    """Search Gmail for travel emails and persist Trip records for new ones."""
    if (await get_account(db)) is None:
        log.info("email parser: no Google account connected, skipping")
        return {"scanned": 0, "new_trips": 0, "skipped": 0}

    scanned = 0
    new_trips = 0
    skipped = 0

    async with httpx.AsyncClient() as http:
        try:
            stubs = await search(http, db, query=TRAVEL_QUERY, max_results=50)
        except (GmailError, OAuthError) as e:
            log.exception("email parser: gmail search failed", error=str(e))
            return {"scanned": 0, "new_trips": 0, "skipped": 0}

        for stub in stubs:
            scanned += 1
            msg_id = stub.get("id")
            if not msg_id:
                continue

            existing = (
                await db.scalars(select(Trip).where(Trip.source_ref == msg_id))
            ).one_or_none()
            if existing is not None:
                skipped += 1
                continue

            try:
                msg = await get_message(http, db, message_id=msg_id, format="full")
            except GmailError:
                log.exception("email parser: get_message failed", message_id=msg_id)
                continue

            subject = header(msg, "Subject") or ""
            body = extract_body(msg)
            try:
                extracted = await _extract(subject, body)
            except Exception:
                log.exception("email parser: extraction failed", message_id=msg_id)
                continue

            if not extracted.get("is_travel_reservation"):
                # Persist a stub row so we don't re-extract the same email tomorrow.
                stub_row = Trip(
                    source="email_parser",
                    source_ref=msg_id,
                    kind="other",
                    title=subject[:200] or None,
                    extra={"is_travel_reservation": False},
                    raw_excerpt=(body[:1000] if body else None),
                )
                db.add(stub_row)
                await db.commit()
                continue

            trip = Trip(
                source="email_parser",
                source_ref=msg_id,
                kind=str(extracted.get("kind", "other"))[:20],
                title=str(extracted.get("title") or subject)[:200],
                origin=(extracted.get("origin") or "")[:80] or None,
                destination=(extracted.get("destination") or "")[:80] or None,
                departure_date=_parse_iso_date(extracted.get("departure_date")),
                return_date=_parse_iso_date(extracted.get("return_date")),
                confirmation_numbers=list(extracted.get("confirmation_numbers") or []),
                extra={"gmail_subject": subject, "gmail_from": header(msg, "From")},
                raw_excerpt=(body[:1000] if body else None),
            )
            db.add(trip)
            await db.commit()
            new_trips += 1

    log.info(
        "email parser run complete",
        scanned=scanned,
        new_trips=new_trips,
        skipped=skipped,
    )
    return {"scanned": scanned, "new_trips": new_trips, "skipped": skipped}
