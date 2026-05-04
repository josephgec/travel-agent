"""Places search + details via Google Places API (New)."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.integrations.google_places import (
    PlacesError,
    get_place,
    summarize_place,
    summarize_place_details,
    text_search,
)

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


SEARCH_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "search_places",
        "description": (
            "Search for real-world places (restaurants, attractions, neighborhoods, "
            "landmarks, etc.) by free-text query. Returns name, address, rating, price level, "
            "lat/lon, and a place_id you can pass to get_place_details. Optionally bias the "
            "search to a location with latitude+longitude+radius_m."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Free-text query, e.g. 'best ramen near Shibuya station' or 'museums in Lisbon'",
                },
                "latitude": {
                    "type": "number",
                    "description": "Optional: bias search around this latitude",
                },
                "longitude": {
                    "type": "number",
                    "description": "Optional: bias search around this longitude",
                },
                "radius_m": {
                    "type": "integer",
                    "description": "Optional: bias radius in meters (default 5000)",
                },
                "included_type": {
                    "type": "string",
                    "description": "Optional: restrict to a primary type, e.g. 'restaurant', 'cafe', 'museum', 'park', 'lodging'",
                },
                "open_now": {
                    "type": "boolean",
                    "description": "Optional: only return places currently open",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Max results (1-20, default 10)",
                },
            },
            "required": ["query"],
        },
    },
}


DETAILS_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "get_place_details",
        "description": (
            "Fetch hours, phone, website, top reviews, and editorial summary for a "
            "single place by its place_id (returned by search_places)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "place_id": {"type": "string", "description": "Google place_id"},
            },
            "required": ["place_id"],
        },
    },
}


async def search_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    query = (args.get("query") or "").strip()
    if not query:
        return {"error": "query is required"}
    try:
        results = await text_search(
            ctx.http,
            query=query,
            latitude=args.get("latitude"),
            longitude=args.get("longitude"),
            radius_m=args.get("radius_m"),
            included_type=args.get("included_type"),
            open_now=args.get("open_now"),
            max_results=int(args.get("max_results", 10)),
        )
    except PlacesError as e:
        return {"error": str(e)}
    return {
        "display_hint": "places",
        "query": query,
        "places": [summarize_place(p) for p in results],
    }


async def details_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    place_id = (args.get("place_id") or "").strip()
    if not place_id:
        return {"error": "place_id is required"}
    try:
        place = await get_place(ctx.http, place_id)
    except PlacesError as e:
        return {"error": str(e)}
    return summarize_place_details(place)
