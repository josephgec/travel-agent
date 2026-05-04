"""Helper to enqueue ARQ jobs from request handlers."""
from __future__ import annotations

from functools import lru_cache

from arq import create_pool
from arq.connections import ArqRedis

from app.workers.tasks import WorkerSettings

_pool: ArqRedis | None = None


async def get_queue() -> ArqRedis:
    global _pool
    if _pool is None:
        _pool = await create_pool(WorkerSettings.redis_settings)
    return _pool


async def enqueue_extraction(conversation_id: str) -> None:
    queue = await get_queue()
    await queue.enqueue_job("extract_memories", conversation_id)


async def enqueue_email_scan() -> None:
    queue = await get_queue()
    await queue.enqueue_job("scan_travel_emails")


# Mark to satisfy linters about WorkerSettings import being load-bearing.
_ = lru_cache
__all__ = ["enqueue_extraction", "get_queue"]
