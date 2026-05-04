"""Memory + preference CRUD on top of the ORM models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.memory.embedder import embed
from app.models import Memory, Preference

# Cosine *distance* threshold used by pgvector's <=>. Distance 0 = identical, 2 = opposite.
# We accept results with distance below this — i.e. similarity >= (1 - 0.5) = 0.5.
DEFAULT_DISTANCE_THRESHOLD = 1.0
DUPLICATE_DISTANCE_THRESHOLD = 0.30  # ~similarity 0.85


# --- Preferences --------------------------------------------------------------

async def get_all_preferences_flat(db: AsyncSession) -> dict[str, Any]:
    """Return flat {key: value} mapping of all preferences."""
    rows = (await db.scalars(select(Preference))).all()
    return {p.key: p.value for p in rows}


async def get_all_preferences_nested(db: AsyncSession) -> dict[str, Any]:
    """Return preferences as a nested dict, splitting keys on '.'."""
    flat = await get_all_preferences_flat(db)
    nested: dict[str, Any] = {}
    for key, value in flat.items():
        parts = key.split(".")
        cursor = nested
        for part in parts[:-1]:
            if not isinstance(cursor.get(part), dict):
                cursor[part] = {}
            cursor = cursor[part]
        cursor[parts[-1]] = value
    return nested


async def set_preference(db: AsyncSession, key: str, value: Any) -> Preference:
    """Upsert a single preference."""
    stmt = (
        insert(Preference)
        .values(key=key, value=value)
        .on_conflict_do_update(
            index_elements=["key"],
            set_={"value": value, "updated_at": datetime.now(timezone.utc)},
        )
        .returning(Preference)
    )
    pref = (await db.scalars(stmt)).one()
    await db.commit()
    return pref


async def delete_preference(db: AsyncSession, key: str) -> bool:
    pref = (await db.scalars(select(Preference).where(Preference.key == key))).one_or_none()
    if pref is None:
        return False
    await db.delete(pref)
    await db.commit()
    return True


# --- Memories -----------------------------------------------------------------

async def add_memory(
    db: AsyncSession,
    *,
    kind: str,
    title: str,
    content: str,
    importance: int = 3,
    source_message_id: uuid.UUID | None = None,
) -> Memory:
    """Embed and persist a memory."""
    vec = await embed(f"{title}\n{content}")
    mem = Memory(
        kind=kind,
        title=title,
        content=content,
        embedding=vec,
        importance=importance,
        source_message_id=source_message_id,
    )
    db.add(mem)
    await db.commit()
    await db.refresh(mem)
    return mem


async def find_duplicate(
    db: AsyncSession,
    *,
    title: str,
    content: str,
    threshold: float = DUPLICATE_DISTANCE_THRESHOLD,
) -> Memory | None:
    """Return an existing memory considered a duplicate of the given title+content, or None."""
    vec = await embed(f"{title}\n{content}")
    distance = Memory.embedding.cosine_distance(vec)
    stmt = (
        select(Memory)
        .where(distance < threshold)
        .order_by(distance)
        .limit(1)
    )
    return (await db.scalars(stmt)).one_or_none()


async def search_memories(
    db: AsyncSession,
    query: str,
    *,
    k: int = 5,
    kinds: list[str] | None = None,
    distance_threshold: float = DEFAULT_DISTANCE_THRESHOLD,
) -> list[tuple[Memory, float]]:
    """Vector-search memories. Returns list of (memory, distance) sorted by ascending distance."""
    vec = await embed(query)
    distance = Memory.embedding.cosine_distance(vec).label("distance")
    stmt = select(Memory, distance).order_by(distance).limit(k)
    if kinds:
        stmt = stmt.where(Memory.kind.in_(kinds))
    stmt = stmt.where(distance < distance_threshold)
    rows = (await db.execute(stmt)).all()

    # Touch last_used_at for any returned memories.
    if rows:
        ids = [m.id for m, _ in rows]
        await db.execute(
            update(Memory).where(Memory.id.in_(ids)).values(last_used_at=datetime.now(timezone.utc))
        )
        await db.commit()

    return [(m, float(d)) for m, d in rows]
