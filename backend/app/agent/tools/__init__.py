"""Tool registry.

Each tool module exports either:
  - TOOL_DEFINITION + async execute(args, ctx)
  - or one or more (definition, execute) pairs registered manually below.

All tool execute() functions catch their own integration errors and return
{"error": "..."} rather than raising — the agent can read the error and react.
"""
from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.tools import calendar as calendar_tool
from app.agent.tools import flights as flights_tool
from app.agent.tools import gmail as gmail_tool
from app.agent.tools import hotels as hotels_tool
from app.agent.tools import maps as maps_tool
from app.agent.tools import memory as memory_tool
from app.agent.tools import places as places_tool
from app.agent.tools import plans as plans_tool
from app.agent.tools import preferences as preferences_tool
from app.agent.tools import weather

ToolFn = Callable[[dict[str, Any], "ToolContext"], Awaitable[dict[str, Any]]]


@dataclass
class ToolContext:
    db: AsyncSession
    http: httpx.AsyncClient
    conversation_id: uuid.UUID


@dataclass(frozen=True)
class Tool:
    name: str
    definition: dict[str, Any]
    execute: ToolFn


_REGISTRY: dict[str, Tool] = {}


def _register(definition: dict[str, Any], execute: ToolFn) -> None:
    name = definition["function"]["name"]
    _REGISTRY[name] = Tool(name=name, definition=definition, execute=execute)


_register(weather.TOOL_DEFINITION, weather.execute)
_register(memory_tool.TOOL_DEFINITION, memory_tool.execute)
_register(preferences_tool.SAVE_TOOL_DEFINITION, preferences_tool.save_preference_execute)
_register(preferences_tool.GET_TOOL_DEFINITION, preferences_tool.get_preferences_execute)
_register(flights_tool.SEARCH_TOOL_DEFINITION, flights_tool.search_execute)
_register(flights_tool.DETAILS_TOOL_DEFINITION, flights_tool.details_execute)
_register(hotels_tool.SEARCH_TOOL_DEFINITION, hotels_tool.search_execute)
_register(places_tool.SEARCH_TOOL_DEFINITION, places_tool.search_execute)
_register(places_tool.DETAILS_TOOL_DEFINITION, places_tool.details_execute)
_register(maps_tool.DIRECTIONS_TOOL_DEFINITION, maps_tool.directions_execute)
_register(maps_tool.MATRIX_TOOL_DEFINITION, maps_tool.matrix_execute)
_register(gmail_tool.SEARCH_TOOL_DEFINITION, gmail_tool.search_execute)
_register(gmail_tool.GET_TOOL_DEFINITION, gmail_tool.get_execute)
_register(
    calendar_tool.CHECK_AVAILABILITY_TOOL_DEFINITION,
    calendar_tool.check_availability_execute,
)
_register(
    calendar_tool.CREATE_EVENT_TOOL_DEFINITION,
    calendar_tool.create_event_execute,
)
_register(
    calendar_tool.LIST_TRIPS_TOOL_DEFINITION,
    calendar_tool.list_trips_execute,
)
_register(plans_tool.CREATE_TOOL_DEFINITION, plans_tool.create_execute)
_register(plans_tool.UPDATE_TOOL_DEFINITION, plans_tool.update_execute)
_register(plans_tool.GET_TOOL_DEFINITION, plans_tool.get_execute)


def get_all_tools() -> list[dict[str, Any]]:
    """Return all tool definitions in Ollama function-calling format."""
    return [t.definition for t in _REGISTRY.values()]


async def dispatch(name: str, args: dict[str, Any], ctx: ToolContext) -> dict[str, Any]:
    tool = _REGISTRY.get(name)
    if tool is None:
        return {"error": f"unknown tool: {name}"}
    return await tool.execute(args, ctx)
