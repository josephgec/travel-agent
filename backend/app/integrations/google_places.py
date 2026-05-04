"""Google Places API (New) client.

Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview

The new API uses POST endpoints with mandatory `X-Goog-FieldMask` headers — you must
declare which response fields you want. Be conservative; broader masks cost more.
"""
from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger(__name__)

API_BASE = "https://places.googleapis.com/v1"

# Lightweight fields for list views — keep this small to control cost.
SEARCH_FIELDS = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.primaryType",
        "places.types",
        "places.googleMapsUri",
    ]
)

# Wider fields for detail view.
DETAIL_FIELDS = ",".join(
    [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "rating",
        "userRatingCount",
        "priceLevel",
        "primaryType",
        "types",
        "googleMapsUri",
        "regularOpeningHours",
        "currentOpeningHours",
        "internationalPhoneNumber",
        "websiteUri",
        "editorialSummary",
        "reviews",
        "photos",
    ]
)


class PlacesError(Exception):
    pass


def _key() -> str:
    s = get_settings()
    if not s.google_places_api_key:
        raise PlacesError("GOOGLE_PLACES_API_KEY is not set")
    return s.google_places_api_key


async def text_search(
    http: httpx.AsyncClient,
    *,
    query: str,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_m: int | None = None,
    included_type: str | None = None,
    open_now: bool | None = None,
    max_results: int = 10,
) -> list[dict[str, Any]]:
    """Free-text place search, optionally biased to a location + radius."""
    body: dict[str, Any] = {"textQuery": query, "maxResultCount": max(1, min(20, max_results))}
    if latitude is not None and longitude is not None:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": float(radius_m or 5000),
            }
        }
    if included_type:
        body["includedType"] = included_type
    if open_now is not None:
        body["openNow"] = open_now

    resp = await http.post(
        f"{API_BASE}/places:searchText",
        json=body,
        headers={
            "X-Goog-Api-Key": _key(),
            "X-Goog-FieldMask": SEARCH_FIELDS,
            "Content-Type": "application/json",
        },
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise PlacesError(f"places searchText {resp.status_code}: {resp.text[:300]}")
    return resp.json().get("places", []) or []


async def get_place(http: httpx.AsyncClient, place_id: str) -> dict[str, Any]:
    """Fetch detailed information for a single place by id."""
    resp = await http.get(
        f"{API_BASE}/places/{place_id}",
        headers={
            "X-Goog-Api-Key": _key(),
            "X-Goog-FieldMask": DETAIL_FIELDS,
        },
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise PlacesError(f"places get {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def summarize_place(place: dict[str, Any]) -> dict[str, Any]:
    name = (place.get("displayName") or {}).get("text")
    loc = place.get("location") or {}
    return {
        "place_id": place.get("id"),
        "name": name,
        "address": place.get("formattedAddress"),
        "latitude": loc.get("latitude"),
        "longitude": loc.get("longitude"),
        "rating": place.get("rating"),
        "rating_count": place.get("userRatingCount"),
        "price_level": place.get("priceLevel"),  # PRICE_LEVEL_INEXPENSIVE etc.
        "primary_type": place.get("primaryType"),
        "types": place.get("types") or [],
        "maps_url": place.get("googleMapsUri"),
    }


def summarize_place_details(place: dict[str, Any]) -> dict[str, Any]:
    base = summarize_place(place)
    hours = place.get("regularOpeningHours") or {}
    weekday_text = hours.get("weekdayDescriptions")
    summary = (place.get("editorialSummary") or {}).get("text")
    reviews = []
    for r in (place.get("reviews") or [])[:3]:
        reviews.append(
            {
                "author": (r.get("authorAttribution") or {}).get("displayName"),
                "rating": r.get("rating"),
                "relative_time": r.get("relativePublishTimeDescription"),
                "text": (r.get("text") or {}).get("text"),
            }
        )
    return {
        **base,
        "phone": place.get("internationalPhoneNumber"),
        "website": place.get("websiteUri"),
        "summary": summary,
        "open_now": (place.get("currentOpeningHours") or {}).get("openNow"),
        "weekly_hours": weekday_text,
        "reviews": reviews,
    }
