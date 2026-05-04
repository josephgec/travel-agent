"""Embedding wrapper around Ollama."""
from __future__ import annotations

from app.agent.llm import get_client
from app.config import get_settings


async def embed(text: str) -> list[float]:
    """Embed a single text. Returns a 1024-dim vector for mxbai-embed-large."""
    settings = get_settings()
    client = get_client()
    resp = await client.embed(model=settings.ollama_embed_model, input=text)
    embeddings = resp.get("embeddings") if isinstance(resp, dict) else resp.embeddings
    if not embeddings:
        raise RuntimeError(f"empty embedding response: {resp!r}")
    return list(embeddings[0])


async def embed_many(texts: list[str]) -> list[list[float]]:
    """Embed a batch. Falls back to single calls if the model doesn't accept batches."""
    if not texts:
        return []
    settings = get_settings()
    client = get_client()
    resp = await client.embed(model=settings.ollama_embed_model, input=texts)
    embeddings = resp.get("embeddings") if isinstance(resp, dict) else resp.embeddings
    if not embeddings:
        raise RuntimeError(f"empty embedding response: {resp!r}")
    return [list(e) for e in embeddings]
