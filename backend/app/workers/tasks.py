"""ARQ worker: background tasks (memory extraction, daily email parser)."""
from __future__ import annotations

import uuid
from typing import Any

import structlog
from arq import cron
from arq.connections import RedisSettings

from app.config import get_settings
from app.db import SessionLocal
from app.memory.extractor import run_extraction
from app.workers.email_parser import parse_recent_emails

log = structlog.get_logger(__name__)


async def extract_memories(ctx: dict[str, Any], conversation_id: str) -> dict[str, int]:
    cid = uuid.UUID(conversation_id)
    async with SessionLocal() as db:
        return await run_extraction(db, cid)


async def scan_travel_emails(ctx: dict[str, Any]) -> dict[str, int]:
    """Triggerable on-demand or via the daily cron below."""
    async with SessionLocal() as db:
        return await parse_recent_emails(db)


def _redis_settings() -> RedisSettings:
    s = get_settings()
    return RedisSettings.from_dsn(s.redis_url)


class WorkerSettings:
    functions = [extract_memories, scan_travel_emails]
    cron_jobs = [
        # Daily at 06:30 UTC. Adjust as you like.
        cron(scan_travel_emails, hour=6, minute=30, run_at_startup=False),
    ]
    redis_settings = _redis_settings()
    keep_result = 60
    job_timeout = 600  # email parser may run dozens of LLM extractions
