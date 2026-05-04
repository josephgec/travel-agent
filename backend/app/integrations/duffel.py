"""Thin async client around the Duffel REST API.

Docs: https://duffel.com/docs/api/v2
We only implement what the agent currently needs: offer requests + offer fetch.
"""
from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger(__name__)

API_BASE = "https://api.duffel.com"
API_VERSION = "v2"


class DuffelError(Exception):
    pass


def _headers() -> dict[str, str]:
    s = get_settings()
    if not s.duffel_api_key:
        raise DuffelError("DUFFEL_API_KEY is not set")
    return {
        "Authorization": f"Bearer {s.duffel_api_key}",
        "Duffel-Version": API_VERSION,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


async def search_offers(
    http: httpx.AsyncClient,
    *,
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None = None,
    adults: int = 1,
    cabin_class: str = "economy",
    max_offers: int = 5,
) -> list[dict[str, Any]]:
    """Create an offer request and return the top N offers, cheapest first.

    `origin` and `destination` are IATA airport or city codes (e.g. SFO, NRT, LON).
    Dates are ISO YYYY-MM-DD.
    """
    slices = [{"origin": origin, "destination": destination, "departure_date": departure_date}]
    if return_date:
        slices.append(
            {"origin": destination, "destination": origin, "departure_date": return_date}
        )

    body = {
        "data": {
            "slices": slices,
            "passengers": [{"type": "adult"}] * adults,
            "cabin_class": cabin_class,
        }
    }

    # `return_offers=true` short-circuits the two-step request->offers dance.
    resp = await http.post(
        f"{API_BASE}/air/offer_requests",
        json=body,
        headers=_headers(),
        params={"return_offers": "true"},
        timeout=30.0,
    )
    if resp.status_code >= 400:
        raise DuffelError(f"duffel offer_requests {resp.status_code}: {resp.text[:300]}")

    data = resp.json().get("data", {})
    offers: list[dict[str, Any]] = data.get("offers", []) or []
    offers.sort(key=lambda o: float(o.get("total_amount", "9e9")))
    return offers[:max_offers]


async def get_offer(http: httpx.AsyncClient, offer_id: str) -> dict[str, Any]:
    resp = await http.get(
        f"{API_BASE}/air/offers/{offer_id}",
        headers=_headers(),
        params={"return_available_services": "false"},
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise DuffelError(f"duffel get_offer {resp.status_code}: {resp.text[:300]}")
    return resp.json().get("data", {})


def summarize_offer(offer: dict[str, Any]) -> dict[str, Any]:
    """Pull out the fields we want to surface to the agent + UI."""
    slices = offer.get("slices", []) or []
    summary_slices = []
    for s in slices:
        segments = s.get("segments", []) or []
        first, last = segments[0] if segments else {}, segments[-1] if segments else {}
        summary_slices.append(
            {
                "origin": (s.get("origin") or {}).get("iata_code"),
                "destination": (s.get("destination") or {}).get("iata_code"),
                "departing_at": first.get("departing_at") if isinstance(first, dict) else None,
                "arriving_at": last.get("arriving_at") if isinstance(last, dict) else None,
                "duration": s.get("duration"),
                "stops": max(0, len(segments) - 1),
                "carriers": sorted({
                    (seg.get("marketing_carrier") or {}).get("iata_code", "")
                    for seg in segments
                    if isinstance(seg, dict)
                }),
            }
        )
    return {
        "id": offer.get("id"),
        "total_amount": offer.get("total_amount"),
        "total_currency": offer.get("total_currency"),
        "owner": (offer.get("owner") or {}).get("name"),
        "expires_at": offer.get("expires_at"),
        "slices": summary_slices,
    }
