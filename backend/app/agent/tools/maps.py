"""Directions + distance-matrix via Google Routes API."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.integrations.google_routes import (
    RoutesError,
    compute_route_matrix,
    compute_routes,
)

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


_WAYPOINT_SCHEMA = {
    "type": "object",
    "description": (
        "A waypoint. Provide ONE of: {address: '...'}, {place_id: '...'}, "
        "or {latitude: ..., longitude: ...}."
    ),
    "properties": {
        "address": {"type": "string"},
        "place_id": {"type": "string"},
        "latitude": {"type": "number"},
        "longitude": {"type": "number"},
    },
}


DIRECTIONS_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "get_directions",
        "description": (
            "Get turn-by-turn directions between two waypoints. "
            "Returns total duration, distance, and a list of step instructions."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "origin": _WAYPOINT_SCHEMA,
                "destination": _WAYPOINT_SCHEMA,
                "mode": {
                    "type": "string",
                    "enum": ["DRIVE", "WALK", "BICYCLE", "TWO_WHEELER", "TRANSIT"],
                    "description": "Travel mode (default DRIVE)",
                },
            },
            "required": ["origin", "destination"],
        },
    },
}


MATRIX_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "compute_distance_matrix",
        "description": (
            "Compute pairwise duration + distance for every (origin, destination) pair. "
            "Useful for 'is this hotel walkable to that restaurant' / 'which of these "
            "options is closest to the airport' style questions."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "origins": {
                    "type": "array",
                    "items": _WAYPOINT_SCHEMA,
                    "description": "List of origin waypoints",
                },
                "destinations": {
                    "type": "array",
                    "items": _WAYPOINT_SCHEMA,
                    "description": "List of destination waypoints",
                },
                "mode": {
                    "type": "string",
                    "enum": ["DRIVE", "WALK", "BICYCLE", "TWO_WHEELER", "TRANSIT"],
                    "description": "Travel mode (default DRIVE)",
                },
            },
            "required": ["origins", "destinations"],
        },
    },
}


async def directions_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    origin = args.get("origin")
    destination = args.get("destination")
    if origin is None or destination is None:
        return {"error": "origin and destination are required"}
    try:
        route = await compute_routes(
            ctx.http,
            origin=origin,
            destination=destination,
            mode=args.get("mode", "DRIVE"),
        )
    except RoutesError as e:
        return {"error": str(e)}
    return {"display_hint": "directions", **route}


async def matrix_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    origins = args.get("origins") or []
    destinations = args.get("destinations") or []
    if not origins or not destinations:
        return {"error": "origins and destinations are required (non-empty)"}
    try:
        rows = await compute_route_matrix(
            ctx.http,
            origins=origins,
            destinations=destinations,
            mode=args.get("mode", "DRIVE"),
        )
    except RoutesError as e:
        return {"error": str(e)}
    return {"matrix": rows}
