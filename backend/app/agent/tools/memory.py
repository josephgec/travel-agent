"""Memory recall tool — vector search over past conversations and saved facts."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.memory.store import search_memories

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "recall_memories",
        "description": (
            "Search long-term memory (past trips, saved facts about the user, patterns) "
            "for content semantically similar to the query. Use this when the user references "
            "something from a past conversation or you need context that wouldn't be in the "
            "current chat."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural-language description of what to recall",
                },
                "kind": {
                    "type": "string",
                    "enum": ["trip", "fact", "pattern"],
                    "description": "Optional filter: trip = past trips, fact = standalone facts, pattern = behavioral patterns",
                },
                "k": {
                    "type": "integer",
                    "description": "Max results to return (default 5)",
                },
            },
            "required": ["query"],
        },
    },
}


async def execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    query = args.get("query")
    if not query:
        return {"error": "query is required"}
    kind = args.get("kind")
    k = int(args.get("k", 5))
    kinds = [kind] if kind else None
    try:
        hits = await search_memories(ctx.db, query, k=k, kinds=kinds)
    except Exception as e:
        return {"error": f"memory search failed: {e}"}

    return {
        "results": [
            {
                "kind": m.kind,
                "title": m.title,
                "content": m.content,
                "importance": m.importance,
                "similarity": round(1 - distance, 3),
            }
            for m, distance in hits
        ],
    }
