from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.loop import event_to_sse, run_turn
from app.db import get_session
from app.schemas.chat import ChatRequest

router = APIRouter(prefix="/api", tags=["chat"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


@router.post("/chat")
async def chat(body: ChatRequest, db: DbSession) -> StreamingResponse:
    async def event_source() -> AsyncIterator[bytes]:
        async for event in run_turn(db, body.conversation_id, body.message):
            yield event_to_sse(event)

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",  # tell proxies not to buffer
        },
    )
