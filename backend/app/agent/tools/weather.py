"""Weather forecast via Open-Meteo (no API key required)."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

import httpx

if TYPE_CHECKING:
    from app.agent.tools import ToolContext

TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": (
            "Get current conditions and a 7-day forecast for a location. "
            "Caller must supply latitude and longitude (use a places/geocoding tool first "
            "if you only have a city name)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "latitude": {
                    "type": "number",
                    "description": "Latitude in decimal degrees (e.g. 35.6762 for Tokyo)",
                },
                "longitude": {
                    "type": "number",
                    "description": "Longitude in decimal degrees (e.g. 139.6503 for Tokyo)",
                },
                "location_name": {
                    "type": "string",
                    "description": "Human-readable name for the location (echoed back in the result for clarity)",
                },
            },
            "required": ["latitude", "longitude"],
        },
    },
}


async def execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    lat = args.get("latitude")
    lon = args.get("longitude")
    name = args.get("location_name")

    if lat is None or lon is None:
        return {"error": "latitude and longitude are required"}

    try:
        resp = await ctx.http.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
                "timezone": "auto",
                "forecast_days": 7,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except httpx.TimeoutException as e:
        return {"error": f"weather request timed out: {e}"}
    except httpx.HTTPError as e:
        return {"error": f"weather request failed: {e}"}

    return {
        "location": name,
        "latitude": lat,
        "longitude": lon,
        "timezone": data.get("timezone"),
        "current": data.get("current"),
        "daily": data.get("daily"),
    }
