"""Extract long-term facts, preferences, and trip notes from a conversation tail.

Runs as an ARQ background task after every assistant turn.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.llm import get_client
from app.config import get_settings
from app.memory.store import add_memory, find_duplicate, set_preference
from app.models import Message

log = structlog.get_logger(__name__)

EXTRACTION_PROMPT = """You analyze a snippet of a conversation between a user and a travel assistant, then extract any new long-term facts about the user that should be remembered across future conversations.

Return strict JSON matching this exact shape (the values shown are real examples, not placeholders — emit the same kinds of plain values, NOT string-wrapped values):

{
  "memories": [
    {"kind": "trip", "title": "Lisbon weekend Mar 2026", "content": "User went to Lisbon for a long weekend in March 2026 and especially liked the Chiado neighborhood.", "importance": 3}
  ],
  "preferences": [
    {"key": "flights.seat", "value": "aisle"},
    {"key": "home.airport", "value": "SFO"},
    {"key": "dietary.restrictions", "value": ["vegetarian", "no shellfish"]},
    {"key": "flights.frequent_flyer.UA", "value": "ABC123"},
    {"key": "hotels.min_stars", "value": 4}
  ]
}

Rules:
- "kind" is one of: "trip" (a past or planned trip), "fact" (a standalone fact), "pattern" (a behavior pattern).
- "memories" are episodic — past trips, notable moments, opinions about places.
- "preferences" are durable choices — seat type, dietary restrictions, home airport, frequent-flyer numbers, hotel star floor.
- For "value": emit the natural JSON value type. Strings as plain strings (e.g. "aisle", NOT "\\"aisle\\""). Numbers as numbers. Lists as lists.
- Only emit something if it is a NEW fact stated or strongly implied in this snippet. Skip obvious smalltalk.
- If nothing notable, return {"memories": [], "preferences": []}.
- Output ONLY the JSON object — no prose, no fences, no commentary."""


def _unwrap_double_encoded(value: Any) -> Any:
    """If the LLM returned a string whose contents are themselves valid JSON for a
    structured type (number / bool / list / object), unwrap one layer. Plain strings
    stay strings — we never strip surrounding quotes from a string the user might
    actually want stored verbatim."""
    if not isinstance(value, str):
        return value
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, ValueError):
        return value
    if isinstance(parsed, str):
        return value
    return parsed


def _format_messages(messages: list[Message]) -> str:
    lines = []
    for m in messages:
        text = ""
        c = m.content or {}
        if isinstance(c, dict):
            text = c.get("text") or json.dumps(c.get("result", c))
        lines.append(f"[{m.role}] {text}")
    return "\n".join(lines)


async def _call_extractor(snippet: str) -> dict[str, Any]:
    settings = get_settings()
    client = get_client()
    resp = await client.chat(
        model=settings.ollama_model_fast,
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": f"Conversation snippet:\n{snippet}"},
        ],
        format="json",
        stream=False,
    )
    content = ""
    if isinstance(resp, dict):
        content = (resp.get("message") or {}).get("content", "")
    else:
        content = resp.message.content if hasattr(resp, "message") else ""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        log.warning("extractor returned non-JSON", content=content[:500])
        return {"memories": [], "preferences": []}


async def run_extraction(db: AsyncSession, conversation_id: uuid.UUID, tail: int = 6) -> dict:
    """Inspect the last `tail` messages of a conversation and persist what's new."""
    q = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(tail)
    )
    recent = list(reversed((await db.scalars(q)).all()))
    if not recent:
        return {"memories": 0, "preferences": 0}

    snippet = _format_messages(recent)
    extraction = await _call_extractor(snippet)

    new_memories = 0
    for m in extraction.get("memories", []) or []:
        try:
            kind = m.get("kind", "fact")
            title = m.get("title", "").strip()[:200]
            content = m.get("content", "").strip()
            importance = int(m.get("importance", 3))
            if not title or not content:
                continue
            if kind not in ("trip", "fact", "pattern"):
                kind = "fact"
            if await find_duplicate(db, title=title, content=content):
                continue
            await add_memory(
                db,
                kind=kind,
                title=title,
                content=content,
                importance=max(1, min(5, importance)),
                source_message_id=recent[-1].id,
            )
            new_memories += 1
        except Exception:
            log.exception("failed to persist memory", payload=m)

    new_prefs = 0
    for p in extraction.get("preferences", []) or []:
        try:
            key = (p.get("key") or "").strip()
            if not key:
                continue
            value = _unwrap_double_encoded(p.get("value"))
            await set_preference(db, key, value)
            new_prefs += 1
        except Exception:
            log.exception("failed to persist preference", payload=p)

    log.info(
        "extraction complete",
        conversation_id=str(conversation_id),
        new_memories=new_memories,
        new_preferences=new_prefs,
    )
    return {"memories": new_memories, "preferences": new_prefs}
