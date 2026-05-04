"""Hotel search via LiteAPI."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.integrations.liteapi import (
    LiteApiError,
    get_rates,
    list_hotels,
    summarize_rate,
)

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


SEARCH_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "search_hotels",
        "description": (
            "Search for real hotel offers in a city for a date range. "
            "Returns up to N offers with name, price, currency, and lat/lon. "
            "country_code is the ISO-3166-1 alpha-2 code (JP, US, FR, GB). "
            "city_name is the plain English name (Tokyo, New York, Paris, London). "
            "Optionally narrow the search by passing latitude/longitude + radius_m."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "country_code": {
                    "type": "string",
                    "description": "ISO-3166-1 alpha-2 country code (JP, US, FR, GB, ...)",
                },
                "city_name": {
                    "type": "string",
                    "description": "Plain English city name (Tokyo, New York, ...)",
                },
                "latitude": {
                    "type": "number",
                    "description": "Optional: search around this latitude instead of city centroid",
                },
                "longitude": {
                    "type": "number",
                    "description": "Optional: search around this longitude",
                },
                "radius_m": {
                    "type": "integer",
                    "description": "Optional: radius in meters when using lat/lon (default 5000)",
                },
                "check_in": {"type": "string", "description": "Check-in, ISO YYYY-MM-DD"},
                "check_out": {"type": "string", "description": "Check-out, ISO YYYY-MM-DD"},
                "adults": {"type": "integer", "description": "Number of adults (default 1)"},
                "max_offers": {
                    "type": "integer",
                    "description": "Max offers to return (default 5)",
                },
                "currency": {
                    "type": "string",
                    "description": "ISO 4217 currency (default USD)",
                },
            },
            "required": ["country_code", "check_in", "check_out"],
        },
    },
}


async def search_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    country_code = (args.get("country_code") or "").strip().upper()
    city_name = (args.get("city_name") or "").strip() or None
    check_in = (args.get("check_in") or "").strip()
    check_out = (args.get("check_out") or "").strip()
    if not (country_code and check_in and check_out):
        return {"error": "country_code, check_in, and check_out are required"}

    adults = int(args.get("adults", 1))
    max_offers = max(1, min(10, int(args.get("max_offers", 5))))
    currency = (args.get("currency") or "USD").strip().upper()
    latitude = args.get("latitude")
    longitude = args.get("longitude")
    radius_m = int(args.get("radius_m", 5000)) if (latitude is not None and longitude is not None) else None

    try:
        hotels = await list_hotels(
            ctx.http,
            country_code=country_code,
            city_name=city_name,
            latitude=float(latitude) if latitude is not None else None,
            longitude=float(longitude) if longitude is not None else None,
            radius_m=radius_m,
            limit=40,
        )
    except LiteApiError as e:
        return {"error": str(e)}

    if not hotels:
        return {
            "display_hint": "hotel_offers",
            "query": _query_dict(country_code, city_name, check_in, check_out, adults),
            "offers": [],
            "note": "no hotels found in this area",
        }

    # LiteAPI rates can be picky on batch size — group in 25s.
    hotels_by_id = {h["id"]: h for h in hotels if h.get("id")}
    hotel_ids = list(hotels_by_id.keys())

    collected: list[dict[str, Any]] = []
    for i in range(0, len(hotel_ids), 25):
        batch = hotel_ids[i : i + 25]
        try:
            rates = await get_rates(
                ctx.http,
                hotel_ids=batch,
                check_in=check_in,
                check_out=check_out,
                adults=adults,
                currency=currency,
            )
        except LiteApiError as e:
            if collected:
                # Partial result is still useful; surface a warning.
                summarized = _summarize(collected, hotels_by_id, max_offers)
                return {
                    "display_hint": "hotel_offers",
                    "query": _query_dict(country_code, city_name, check_in, check_out, adults),
                    "offers": summarized,
                    "warning": f"partial result; later batch failed: {e}",
                }
            return {"error": str(e)}
        collected.extend(rates)
        if len(collected) >= max_offers * 4:
            break

    summarized = _summarize(collected, hotels_by_id, max_offers)
    return {
        "display_hint": "hotel_offers",
        "query": _query_dict(country_code, city_name, check_in, check_out, adults),
        "offers": summarized,
    }


def _summarize(
    rates: list[dict[str, Any]], hotels_by_id: dict[str, dict[str, Any]], max_offers: int
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for envelope in rates:
        meta = hotels_by_id.get(envelope.get("hotelId"), {})
        s = summarize_rate(envelope, meta)
        if s is not None:
            out.append(s)
    out.sort(key=lambda s: float(s.get("total_amount") or "9e9"))
    return out[:max_offers]


def _query_dict(
    country_code: str,
    city_name: str | None,
    check_in: str,
    check_out: str,
    adults: int,
) -> dict[str, Any]:
    # `city_code` field name kept for the existing UI card; it carries city or country.
    return {
        "city_code": city_name or country_code,
        "check_in": check_in,
        "check_out": check_out,
        "adults": adults,
        "radius_km": 5,
    }
