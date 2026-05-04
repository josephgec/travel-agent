"""Flight search via Duffel."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.integrations.duffel import (
    DuffelError,
    get_offer,
    search_offers,
    summarize_offer,
)

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


SEARCH_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "search_flights",
        "description": (
            "Search for real flight offers between two airports for given dates. "
            "Returns the cheapest 5 offers with carrier, price, duration, stops, "
            "and an offer_id you can pass to get_flight_details for a full breakdown. "
            "Use IATA codes (SFO, NRT, LHR). For round-trips include return_date."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "origin": {
                    "type": "string",
                    "description": "Origin airport IATA code (e.g. SFO)",
                },
                "destination": {
                    "type": "string",
                    "description": "Destination airport IATA code (e.g. NRT)",
                },
                "departure_date": {
                    "type": "string",
                    "description": "Outbound date, ISO YYYY-MM-DD",
                },
                "return_date": {
                    "type": "string",
                    "description": "Return date, ISO YYYY-MM-DD. Omit for one-way.",
                },
                "adults": {
                    "type": "integer",
                    "description": "Number of adult passengers (default 1)",
                },
                "cabin_class": {
                    "type": "string",
                    "enum": ["economy", "premium_economy", "business", "first"],
                    "description": "Cabin class (default economy)",
                },
            },
            "required": ["origin", "destination", "departure_date"],
        },
    },
}


DETAILS_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "get_flight_details",
        "description": (
            "Fetch the full segment-by-segment breakdown for a specific offer_id "
            "previously returned by search_flights."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "offer_id": {"type": "string", "description": "Offer id from search_flights"},
            },
            "required": ["offer_id"],
        },
    },
}


async def search_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    origin = (args.get("origin") or "").strip().upper()
    destination = (args.get("destination") or "").strip().upper()
    departure_date = (args.get("departure_date") or "").strip()
    if not (origin and destination and departure_date):
        return {"error": "origin, destination, and departure_date are required"}

    try:
        offers = await search_offers(
            ctx.http,
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=args.get("return_date"),
            adults=int(args.get("adults", 1)),
            cabin_class=args.get("cabin_class", "economy"),
        )
    except DuffelError as e:
        return {"error": str(e)}

    return {
        "display_hint": "flight_offers",
        "query": {
            "origin": origin,
            "destination": destination,
            "departure_date": departure_date,
            "return_date": args.get("return_date"),
            "adults": int(args.get("adults", 1)),
            "cabin_class": args.get("cabin_class", "economy"),
        },
        "offers": [summarize_offer(o) for o in offers],
    }


async def details_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    offer_id = (args.get("offer_id") or "").strip()
    if not offer_id:
        return {"error": "offer_id is required"}
    try:
        offer = await get_offer(ctx.http, offer_id)
    except DuffelError as e:
        return {"error": str(e)}
    return offer
