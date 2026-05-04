"""LiteAPI hotels client.

Docs: https://docs.liteapi.travel/

Two-step lookup:
  1. GET /data/hotels?cityName=...&countryCode=...  → list of {id, name, latitude, ...}
  2. POST /hotels/rates body { hotelIds, checkin, checkout, occupancies, ... }
       → live retail rates per hotel

Sandbox keys start with `sand_`, production with `prod_`. Same base URL.
"""
from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger(__name__)

API_BASE = "https://api.liteapi.travel/v3.0"


class LiteApiError(Exception):
    pass


def _headers() -> dict[str, str]:
    s = get_settings()
    if not s.liteapi_api_key:
        raise LiteApiError("LITEAPI_API_KEY is not set")
    return {
        "X-API-Key": s.liteapi_api_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


async def list_hotels(
    http: httpx.AsyncClient,
    *,
    country_code: str,
    city_name: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_m: int | None = None,
    limit: int = 40,
) -> list[dict[str, Any]]:
    """List hotels by city+country, or by lat/lon+radius. Returns lightweight rows."""
    params: dict[str, Any] = {"countryCode": country_code, "limit": limit}
    if city_name:
        params["cityName"] = city_name
    if latitude is not None and longitude is not None:
        params["latitude"] = latitude
        params["longitude"] = longitude
        if radius_m:
            params["distance"] = radius_m

    resp = await http.get(
        f"{API_BASE}/data/hotels",
        params=params,
        headers=_headers(),
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise LiteApiError(f"liteapi list_hotels {resp.status_code}: {resp.text[:300]}")
    return resp.json().get("data", []) or []


async def get_rates(
    http: httpx.AsyncClient,
    *,
    hotel_ids: list[str],
    check_in: str,
    check_out: str,
    adults: int = 1,
    children_ages: list[int] | None = None,
    currency: str = "USD",
    guest_nationality: str = "US",
) -> list[dict[str, Any]]:
    """Live rates for a batch of hotel IDs."""
    if not hotel_ids:
        return []
    body = {
        "hotelIds": hotel_ids,
        "checkin": check_in,
        "checkout": check_out,
        "currency": currency,
        "guestNationality": guest_nationality,
        "occupancies": [{"adults": adults, "children": children_ages or []}],
    }
    resp = await http.post(
        f"{API_BASE}/hotels/rates",
        json=body,
        headers=_headers(),
        timeout=30.0,
    )
    if resp.status_code >= 400:
        raise LiteApiError(f"liteapi get_rates {resp.status_code}: {resp.text[:300]}")
    return resp.json().get("data", []) or []


def summarize_rate(
    rate_envelope: dict[str, Any], hotel_meta: dict[str, Any]
) -> dict[str, Any] | None:
    """Pick the cheapest room+rate for a hotel, return the summarized shape the UI expects."""
    room_types = rate_envelope.get("roomTypes", []) or []
    if not room_types:
        return None

    best: tuple[float, dict[str, Any], dict[str, Any]] | None = None
    for room in room_types:
        for rate in room.get("rates", []) or []:
            retail = rate.get("retailRate") or {}
            totals = retail.get("total") or []
            if not totals:
                continue
            amount = float(totals[0].get("amount") or 0)
            if amount <= 0:
                continue
            if best is None or amount < best[0]:
                best = (amount, room, rate)

    if best is None:
        return None

    amount, room, rate = best
    totals = (rate.get("retailRate") or {}).get("total", []) or [{}]
    currency = totals[0].get("currency") or "USD"
    # LiteAPI's `roomTypeId` is an opaque hash; only surface a room_type if we have a
    # human-readable name. Otherwise leave None and let the UI fall back to the rate name.
    room_name = room.get("name")
    return {
        "hotel_id": rate_envelope.get("hotelId"),
        "name": hotel_meta.get("name"),
        "city_code": hotel_meta.get("city") or hotel_meta.get("cityName"),
        "latitude": hotel_meta.get("latitude"),
        "longitude": hotel_meta.get("longitude"),
        "offer_id": rate.get("rateId") or rate.get("offerId"),
        "check_in": None,  # we know these from the query, UI re-uses query.check_in
        "check_out": None,
        "total_amount": f"{amount:.2f}",
        "currency": currency,
        "rate_code": rate.get("name"),
        "room_type": room_name if isinstance(room_name, str) and room_name else None,
        "beds": None,
        "description": rate.get("boardName"),
    }
