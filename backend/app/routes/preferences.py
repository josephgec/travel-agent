from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.memory.store import delete_preference, set_preference
from app.models import Memory, Preference
from app.schemas.preferences import MemoryOut, PreferenceOut, PreferenceUpsert

router = APIRouter(prefix="/api", tags=["preferences"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


@router.get("/preferences", response_model=list[PreferenceOut])
async def list_preferences(db: DbSession) -> list[Preference]:
    rows = (await db.scalars(select(Preference).order_by(Preference.key))).all()
    return list(rows)


@router.put("/preferences", response_model=PreferenceOut)
async def upsert_preference(body: PreferenceUpsert, db: DbSession) -> Preference:
    return await set_preference(db, body.key, body.value)


@router.delete("/preferences/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_preference(key: str, db: DbSession) -> None:
    deleted = await delete_preference(db, key)
    if not deleted:
        raise HTTPException(status_code=404, detail="preference not found")


@router.get("/memories", response_model=list[MemoryOut])
async def list_memories(db: DbSession) -> list[Memory]:
    rows = (await db.scalars(select(Memory).order_by(Memory.created_at.desc()))).all()
    return list(rows)


@router.delete("/memories/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(memory_id: str, db: DbSession) -> None:
    mem = await db.get(Memory, memory_id)
    if mem is None:
        raise HTTPException(status_code=404, detail="memory not found")
    await db.delete(mem)
    await db.commit()
