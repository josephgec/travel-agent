"""Google Routes API client.

Docs: https://developers.google.com/maps/documentation/routes
Reuses the same GOOGLE_PLACES_API_KEY (you must enable both APIs on the same key
in Google Cloud Console for this to work).
"""
from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger(__name__)

ROUTES_BASE = "https://routes.googleapis.com"

ROUTE_FIELDS = ",".join(
    [
        "routes.duration",
        "routes.distanceMeters",
        "routes.legs.steps.navigationInstruction",
        "routes.legs.steps.distanceMeters",
        "routes.legs.steps.staticDuration",
        "routes.legs.steps.travelMode",
        "routes.polyline.encodedPolyline",
    ]
)

MATRIX_FIELDS = "originIndex,destinationIndex,duration,distanceMeters,status,condition"

VALID_MODES = {"DRIVE", "WALK", "BICYCLE", "TWO_WHEELER", "TRANSIT"}


class RoutesError(Exception):
    pass


def _key() -> str:
    s = get_settings()
    if not s.google_places_api_key:
        raise RoutesError("GOOGLE_PLACES_API_KEY is not set (used for Routes API too)")
    return s.google_places_api_key


def _waypoint(value: dict[str, Any] | str) -> dict[str, Any]:
    """Accept either {'latitude':..., 'longitude':...} or {'address': '...'} or a raw address string."""
    if isinstance(value, str):
        return {"address": value}
    if "address" in value:
        return {"address": value["address"]}
    if "place_id" in value:
        return {"placeId": value["place_id"]}
    if "latitude" in value and "longitude" in value:
        return {
            "location": {
                "latLng": {
                    "latitude": float(value["latitude"]),
                    "longitude": float(value["longitude"]),
                }
            }
        }
    raise RoutesError(f"unrecognized waypoint shape: {value!r}")


async def compute_routes(
    http: httpx.AsyncClient,
    *,
    origin: dict[str, Any] | str,
    destination: dict[str, Any] | str,
    mode: str = "DRIVE",
) -> dict[str, Any]:
    mode = (mode or "DRIVE").upper()
    if mode not in VALID_MODES:
        raise RoutesError(f"invalid mode {mode}; must be one of {sorted(VALID_MODES)}")

    body = {
        "origin": _waypoint(origin),
        "destination": _waypoint(destination),
        "travelMode": mode,
    }
    if mode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"

    resp = await http.post(
        f"{ROUTES_BASE}/directions/v2:computeRoutes",
        json=body,
        headers={
            "X-Goog-Api-Key": _key(),
            "X-Goog-FieldMask": ROUTE_FIELDS,
            "Content-Type": "application/json",
        },
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise RoutesError(f"routes computeRoutes {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    routes = data.get("routes", []) or []
    if not routes:
        return {"mode": mode, "duration": None, "distance_meters": None, "steps": []}

    route = routes[0]
    steps_out: list[dict[str, Any]] = []
    for leg in route.get("legs", []) or []:
        for step in leg.get("steps", []) or []:
            instr = step.get("navigationInstruction") or {}
            steps_out.append(
                {
                    "instruction": instr.get("instructions"),
                    "maneuver": instr.get("maneuver"),
                    "distance_meters": step.get("distanceMeters"),
                    "duration": step.get("staticDuration"),
                    "mode": step.get("travelMode"),
                }
            )
    return {
        "mode": mode,
        "duration": route.get("duration"),
        "distance_meters": route.get("distanceMeters"),
        "polyline": (route.get("polyline") or {}).get("encodedPolyline"),
        "steps": steps_out,
    }


async def compute_route_matrix(
    http: httpx.AsyncClient,
    *,
    origins: list[dict[str, Any] | str],
    destinations: list[dict[str, Any] | str],
    mode: str = "DRIVE",
) -> list[dict[str, Any]]:
    mode = (mode or "DRIVE").upper()
    if mode not in VALID_MODES:
        raise RoutesError(f"invalid mode {mode}; must be one of {sorted(VALID_MODES)}")

    body = {
        "origins": [{"waypoint": _waypoint(o)} for o in origins],
        "destinations": [{"waypoint": _waypoint(d)} for d in destinations],
        "travelMode": mode,
    }
    if mode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"

    resp = await http.post(
        f"{ROUTES_BASE}/distanceMatrix/v2:computeRouteMatrix",
        json=body,
        headers={
            "X-Goog-Api-Key": _key(),
            "X-Goog-FieldMask": MATRIX_FIELDS,
            "Content-Type": "application/json",
        },
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise RoutesError(f"routes computeRouteMatrix {resp.status_code}: {resp.text[:300]}")

    # The matrix endpoint returns a JSON-array stream as a regular array.
    return resp.json() or []
