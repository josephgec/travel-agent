"""Thin wrapper around the Ollama async client.

Centralized so we can swap the backend later (e.g. to llama.cpp's HTTP server)
without touching the agent loop.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any

from ollama import AsyncClient

from app.config import get_settings


@lru_cache
def get_client() -> AsyncClient:
    settings = get_settings()
    return AsyncClient(host=settings.ollama_base_url)


async def chat_stream(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    model: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Stream chat chunks from Ollama.

    Yields dicts of shape (passed straight through from ollama):
      {"message": {"role": "assistant", "content": "...", "tool_calls": [...]}, "done": bool, ...}
    """
    settings = get_settings()
    client = get_client()
    async for chunk in await client.chat(
        model=model or settings.ollama_model,
        messages=messages,
        tools=tools,
        stream=True,
    ):
        # Recursively coerce Pydantic models (tool_calls, function, etc.) to plain dicts
        # so downstream code can JSON-serialize freely.
        if hasattr(chunk, "model_dump"):
            yield chunk.model_dump()
        else:
            yield dict(chunk)
