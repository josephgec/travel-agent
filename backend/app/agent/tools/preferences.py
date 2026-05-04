"""Preference tools — agent can read/write the user's structured preferences."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.memory.store import (
    get_all_preferences_nested,
    set_preference,
)

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


SAVE_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "save_preference",
        "description": (
            "Persist a long-term user preference. Use a flat dotted key like 'flights.seat', "
            "'home.airport', 'dietary.restrictions', 'flights.frequent_flyer.UA'. The value "
            "can be any JSON-compatible value. Most preferences are also auto-extracted "
            "from conversation, so only call this when the user states something explicitly "
            "and you want to confirm it's saved."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "key": {"type": "string", "description": "flat dotted preference key"},
                "value": {
                    "description": "value to store (string, number, boolean, list, object)"
                },
            },
            "required": ["key", "value"],
        },
    },
}


GET_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "get_preferences",
        "description": (
            "Return all of the user's stored preferences as a nested object. "
            "Useful when you need to check a specific value the user hasn't mentioned in this chat."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
}


async def save_preference_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    key = (args.get("key") or "").strip()
    if not key:
        return {"error": "key is required"}
    value = args.get("value")
    try:
        pref = await set_preference(ctx.db, key, value)
    except Exception as e:
        return {"error": f"could not save preference: {e}"}
    return {"saved": True, "key": pref.key, "value": pref.value}


async def get_preferences_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    try:
        prefs = await get_all_preferences_nested(ctx.db)
    except Exception as e:
        return {"error": f"could not load preferences: {e}"}
    return {"preferences": prefs}
