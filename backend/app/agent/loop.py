"""Core agent tool-use loop.

Yields StreamEvents that the SSE route serializes and forwards to the UI.

Loop:
  1. Load conversation history from DB
  2. Append user message; persist
  3. Stream call to Ollama with tools
  4. Accumulate text deltas + any tool_calls in the assistant message
  5. Persist assistant message
  6. If tool_calls present: execute in parallel, persist tool result messages, loop to 3
  7. Else: yield done

Hard cap: 10 tool-use iterations per turn.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Literal

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent import tools as tool_registry
from app.agent.llm import chat_stream
from app.agent.system_prompt import build_system_prompt
from app.memory.store import get_all_preferences_nested, search_memories
from app.models import Conversation, Message
from app.workers.queue import enqueue_extraction

log = structlog.get_logger(__name__)

MAX_TOOL_ITERATIONS = 10


@dataclass
class StreamEvent:
    type: Literal[
        "text_delta",
        "tool_use_start",
        "tool_result",
        "iteration",
        "error",
        "done",
    ]
    data: dict[str, Any]

    def to_json(self) -> str:
        return json.dumps({"type": self.type, "data": self.data})


def _to_chat_message(msg: Message) -> dict[str, Any]:
    """Convert a stored Message row to the dict shape Ollama expects."""
    content = msg.content
    if msg.role == "tool":
        return {
            "role": "tool",
            "content": json.dumps(content.get("result", content)),
            "tool_call_id": content.get("tool_call_id", ""),
        }
    if msg.role == "assistant":
        out: dict[str, Any] = {"role": "assistant", "content": content.get("text", "")}
        tool_calls = content.get("tool_calls")
        if tool_calls:
            out["tool_calls"] = tool_calls
        return out
    # user / system
    return {"role": msg.role, "content": content.get("text", "")}


async def _load_history(db: AsyncSession, conversation_id: uuid.UUID) -> list[Message]:
    q = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return list((await db.scalars(q)).all())


async def _persist_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    role: str,
    content: dict[str, Any],
) -> Message:
    msg = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


def _derive_title(message: str, max_len: int = 50) -> str:
    """Cheap auto-title from the user's first message — first line, trimmed at a word boundary."""
    text = (message or "").strip().split("\n", 1)[0].strip()
    if len(text) <= max_len:
        return text or "New chat"
    cut = text[:max_len]
    sp = cut.rfind(" ")
    if sp > max_len * 0.5:
        cut = cut[:sp]
    return cut.rstrip(" ,.;:") + "…"


async def _ensure_conversation(db: AsyncSession, conversation_id: uuid.UUID) -> Conversation:
    conv = await db.get(Conversation, conversation_id)
    if conv is None:
        raise ValueError(f"conversation {conversation_id} not found")
    return conv


async def _build_user_context(db: AsyncSession, latest_user_message: str) -> dict[str, Any]:
    """Load preferences + top-K relevant memories to seed the system prompt."""
    ctx: dict[str, Any] = {}
    try:
        prefs = await get_all_preferences_nested(db)
        if prefs:
            ctx["preferences"] = prefs
    except Exception:
        log.exception("preference load failed")

    try:
        hits = await search_memories(db, latest_user_message, k=3)
        if hits:
            ctx["relevant_memories"] = [
                f"[{m.kind}, importance={m.importance}] {m.title} — {m.content}"
                for m, _ in hits
            ]
    except Exception:
        log.exception("memory search failed")

    return ctx


async def _execute_tool_calls(
    tool_calls: list[dict[str, Any]],
    ctx: tool_registry.ToolContext,
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    """Execute every tool call concurrently. Return list of (call, result) pairs in order."""

    async def run(call: dict[str, Any]) -> dict[str, Any]:
        fn = call.get("function", {})
        name = fn.get("name", "")
        args = fn.get("arguments", {})
        if isinstance(args, str):
            try:
                args = json.loads(args)
            except json.JSONDecodeError:
                return {"error": f"could not parse arguments: {args!r}"}
        try:
            return await tool_registry.dispatch(name, args, ctx)
        except Exception as e:  # tools should catch their own, but belt-and-braces
            log.exception("tool dispatch crashed", tool=name)
            return {"error": f"tool {name} crashed: {e}"}

    results = await asyncio.gather(*(run(c) for c in tool_calls))
    return list(zip(tool_calls, results, strict=True))


async def run_turn(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_message: str,
) -> AsyncIterator[StreamEvent]:
    """Run a single user turn end-to-end. Yields StreamEvents as they happen."""
    try:
        conv = await _ensure_conversation(db, conversation_id)
    except ValueError as e:
        yield StreamEvent("error", {"message": str(e)})
        return

    # Auto-title brand-new conversations from the first user message.
    if not conv.title:
        conv.title = _derive_title(user_message)
        await db.commit()

    # 1-2: persist user message
    await _persist_message(db, conversation_id, "user", {"text": user_message})

    # Pull user context (preferences + relevant memories) once per turn for the system prompt.
    user_context = await _build_user_context(db, user_message)

    async with httpx.AsyncClient() as http:
        ctx = tool_registry.ToolContext(db=db, http=http, conversation_id=conversation_id)

        for iteration in range(MAX_TOOL_ITERATIONS):
            yield StreamEvent("iteration", {"n": iteration})

            # Load full history each iteration so newly persisted tool results are included.
            history = await _load_history(db, conversation_id)
            messages = [{"role": "system", "content": build_system_prompt(user_context)}]
            messages.extend(_to_chat_message(m) for m in history)

            assistant_text = ""
            tool_calls: list[dict[str, Any]] = []

            try:
                async for chunk in chat_stream(messages, tools=tool_registry.get_all_tools()):
                    msg = chunk.get("message") or {}
                    delta = msg.get("content") or ""
                    if delta:
                        assistant_text += delta
                        yield StreamEvent("text_delta", {"text": delta})

                    # Ollama emits tool_calls on the final chunk for that turn.
                    if msg.get("tool_calls"):
                        # Normalize: tool_calls items may be Mapping objects.
                        for tc in msg["tool_calls"]:
                            tool_calls.append(dict(tc) if not isinstance(tc, dict) else tc)
            except Exception as e:
                log.exception("ollama stream failed")
                yield StreamEvent("error", {"message": f"LLM stream failed: {e}"})
                return

            # Persist assistant message (even if it called tools — round-trip parity).
            assistant_content: dict[str, Any] = {"text": assistant_text}
            if tool_calls:
                # Assign synthetic ids if the model didn't provide one — Ollama often omits them.
                for tc in tool_calls:
                    tc.setdefault("id", f"call_{uuid.uuid4().hex[:12]}")
                assistant_content["tool_calls"] = tool_calls
            await _persist_message(db, conversation_id, "assistant", assistant_content)

            if not tool_calls:
                # Fire-and-forget: extract any new long-term memories/preferences
                # from the tail of this conversation. Don't block the response.
                try:
                    await enqueue_extraction(str(conversation_id))
                except Exception:
                    log.exception("failed to enqueue memory extraction")
                yield StreamEvent("done", {})
                return

            # Announce + execute tools.
            for tc in tool_calls:
                fn = tc.get("function", {})
                yield StreamEvent(
                    "tool_use_start",
                    {
                        "id": tc.get("id"),
                        "name": fn.get("name"),
                        "arguments": fn.get("arguments"),
                    },
                )

            results = await _execute_tool_calls(tool_calls, ctx)

            for call, result in results:
                tool_msg_content = {
                    "tool_call_id": call.get("id"),
                    "tool_name": call.get("function", {}).get("name"),
                    "result": result,
                }
                await _persist_message(db, conversation_id, "tool", tool_msg_content)
                yield StreamEvent("tool_result", tool_msg_content)
            # loop back to give the model the tool results

        yield StreamEvent(
            "error",
            {"message": f"hit max tool iterations ({MAX_TOOL_ITERATIONS}); stopping"},
        )


def event_to_sse(event: StreamEvent) -> bytes:
    """Format a StreamEvent as an SSE record."""
    return f"data: {event.to_json()}\n\n".encode()


__all__ = ["MAX_TOOL_ITERATIONS", "StreamEvent", "event_to_sse", "run_turn"]
