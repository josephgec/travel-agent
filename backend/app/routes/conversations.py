import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Conversation, Message
from app.schemas.chat import ConversationCreate, ConversationOut, MessageOut

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(body: ConversationCreate, db: DbSession) -> Conversation:
    conv = Conversation(title=body.title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.get("", response_model=list[ConversationOut])
async def list_conversations(db: DbSession) -> list[Conversation]:
    q = select(Conversation).order_by(Conversation.updated_at.desc())
    return list((await db.scalars(q)).all())


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(conversation_id: uuid.UUID, db: DbSession) -> Conversation:
    conv = await db.get(Conversation, conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="conversation not found")
    return conv


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(conversation_id: uuid.UUID, db: DbSession) -> list[Message]:
    if await db.get(Conversation, conversation_id) is None:
        raise HTTPException(status_code=404, detail="conversation not found")
    q = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return list((await db.scalars(q)).all())


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: uuid.UUID, db: DbSession) -> None:
    conv = await db.get(Conversation, conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="conversation not found")
    await db.delete(conv)
    await db.commit()
