"""Gmail REST client (read-only).

We talk to the REST API directly with httpx rather than using the official client lib —
the lib is sync-only and adds a bunch of weight we don't need for two endpoints.

Docs: https://developers.google.com/gmail/api/reference/rest/v1/users.messages
"""
from __future__ import annotations

import base64
from typing import Any

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.google_oauth import get_access_token

log = structlog.get_logger(__name__)

API_BASE = "https://gmail.googleapis.com/gmail/v1"


class GmailError(Exception):
    pass


async def search(
    http: httpx.AsyncClient,
    db: AsyncSession,
    *,
    query: str,
    max_results: int = 10,
) -> list[dict[str, Any]]:
    """Run a Gmail search and return list of {id, threadId} stubs."""
    token = await get_access_token(http, db)
    resp = await http.get(
        f"{API_BASE}/users/me/messages",
        params={"q": query, "maxResults": max(1, min(50, max_results))},
        headers={"Authorization": f"Bearer {token}"},
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise GmailError(f"gmail search {resp.status_code}: {resp.text[:300]}")
    return resp.json().get("messages", []) or []


async def get_message(
    http: httpx.AsyncClient,
    db: AsyncSession,
    *,
    message_id: str,
    format: str = "full",
) -> dict[str, Any]:
    token = await get_access_token(http, db)
    resp = await http.get(
        f"{API_BASE}/users/me/messages/{message_id}",
        params={"format": format},
        headers={"Authorization": f"Bearer {token}"},
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise GmailError(f"gmail get {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def _b64url_decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode())


def _walk_parts(payload: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = [payload]
    for p in payload.get("parts") or []:
        out.extend(_walk_parts(p))
    return out


def extract_body(message: dict[str, Any]) -> str:
    """Pull the best-available text body out of a Gmail message envelope."""
    payload = message.get("payload") or {}
    parts = _walk_parts(payload)

    text_plain: str | None = None
    text_html: str | None = None
    for part in parts:
        mime = part.get("mimeType")
        body_data = (part.get("body") or {}).get("data")
        if not body_data:
            continue
        try:
            decoded = _b64url_decode(body_data).decode("utf-8", errors="replace")
        except Exception:
            continue
        if mime == "text/plain" and text_plain is None:
            text_plain = decoded
        elif mime == "text/html" and text_html is None:
            text_html = decoded

    if text_plain:
        return text_plain
    if text_html:
        # Stripped-HTML fallback — keep readable text only.
        import re

        return re.sub(r"<[^>]+>", " ", text_html)
    return message.get("snippet", "") or ""


def header(message: dict[str, Any], name: str) -> str | None:
    headers = ((message.get("payload") or {}).get("headers")) or []
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value")
    return None


def summarize_message(message: dict[str, Any], *, include_body: bool = False) -> dict[str, Any]:
    out = {
        "id": message.get("id"),
        "thread_id": message.get("threadId"),
        "snippet": message.get("snippet"),
        "subject": header(message, "Subject"),
        "from": header(message, "From"),
        "to": header(message, "To"),
        "date": header(message, "Date"),
        "labels": message.get("labelIds") or [],
    }
    if include_body:
        out["body"] = extract_body(message)
    return out
