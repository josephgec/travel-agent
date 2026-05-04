"""Gmail read tools."""
from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from app.integrations.gmail_client import (
    GmailError,
    get_message,
    search,
    summarize_message,
)
from app.integrations.google_oauth import OAuthError

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


SEARCH_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "search_email",
        "description": (
            "Search the user's connected Gmail account using Gmail search syntax "
            "(e.g. `from:united.com newer_than:30d`, `subject:(reservation OR confirmation)`). "
            "Returns subject/from/date/snippet for up to N matches. The user must have "
            "connected their Google account in Settings; if not, you'll get an error."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Gmail search query string",
                },
                "days_back": {
                    "type": "integer",
                    "description": "Optional: restrict to messages from the last N days (adds `newer_than:Nd`)",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Max messages to return (default 10, cap 50)",
                },
            },
            "required": ["query"],
        },
    },
}


GET_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "get_email",
        "description": (
            "Fetch the full body of a specific Gmail message by id "
            "(get the id from search_email first)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "message_id": {"type": "string", "description": "Gmail message id"},
            },
            "required": ["message_id"],
        },
    },
}


async def search_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    query = (args.get("query") or "").strip()
    if not query:
        return {"error": "query is required"}
    days_back = args.get("days_back")
    if days_back:
        query = f"{query} newer_than:{int(days_back)}d"
    max_results = int(args.get("max_results", 10))

    try:
        stubs = await search(ctx.http, ctx.db, query=query, max_results=max_results)
    except (GmailError, OAuthError) as e:
        return {"error": str(e)}

    # Fetch each message's metadata in parallel.
    async def fetch(stub: dict[str, Any]) -> dict[str, Any]:
        msg_id = stub.get("id")
        try:
            msg = await get_message(ctx.http, ctx.db, message_id=msg_id, format="metadata")
            return summarize_message(msg)
        except GmailError as e:
            return {"id": msg_id, "error": str(e)}

    summaries = await asyncio.gather(*(fetch(s) for s in stubs))
    return {
        "display_hint": "emails",
        "query": query,
        "messages": summaries,
    }


async def get_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    message_id = (args.get("message_id") or "").strip()
    if not message_id:
        return {"error": "message_id is required"}
    try:
        msg = await get_message(ctx.http, ctx.db, message_id=message_id, format="full")
    except (GmailError, OAuthError) as e:
        return {"error": str(e)}
    return summarize_message(msg, include_body=True)
