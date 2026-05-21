import secrets
import uuid
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.chat import ChatSession, BotConfig
from services.claude_service import chat_response

router = APIRouter(prefix="/chat", tags=["chat"])

DEFAULT_FALLBACK = "That's a great question! I don't have that specific information, but I'll make sure the agent follows up with you. Can I get your name and email so they can reach you?"


class StartSessionRequest(BaseModel):
    embed_token: str
    visitor_name: str | None = None
    visitor_email: str | None = None
    visitor_phone: str | None = None


class StartSessionResponse(BaseModel):
    session_token: str
    bot_name: str


class MessageRequest(BaseModel):
    session_token: str
    message: str
    visitor_name: str | None = None
    visitor_email: str | None = None


class MessageResponse(BaseModel):
    reply: str
    lead_captured: bool


class SessionOut(BaseModel):
    id: str
    visitor_name: str | None
    visitor_email: str | None
    visitor_phone: str | None
    message_count: int
    lead_captured: bool
    created_at: str


def _build_chatbot_system_prompt(bot: BotConfig, tenant: Tenant) -> str:
    if bot.system_prompt:
        return bot.system_prompt

    ctx = bot.context_data
    lines = [
        f"You are a helpful assistant for {tenant.name}.",
        "Answer questions based only on the information provided below.",
        "If you don't know the answer, say you'll have someone follow up — never make up facts.",
        "Keep responses concise and friendly.",
        "",
        "=== Business / Property Information ===",
    ]
    for key, val in ctx.items():
        lines.append(f"{key.replace('_', ' ').title()}: {val}")
    lines.append("")
    lines.append(f"If the visitor asks something outside this scope, respond: \"{DEFAULT_FALLBACK}\"")
    return "\n".join(lines)


@router.post("/session", response_model=StartSessionResponse)
async def start_session(
    body: StartSessionRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(BotConfig).where(BotConfig.embed_token == body.embed_token, BotConfig.is_active == True)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    session = ChatSession(
        tenant_id=bot.tenant_id,
        bot_config_id=bot.id,
        session_token=secrets.token_urlsafe(32),
        visitor_name=body.visitor_name,
        visitor_email=body.visitor_email,
        visitor_phone=body.visitor_phone,
        messages=[],
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return StartSessionResponse(session_token=session.session_token, bot_name=bot.name)


@router.post("/message", response_model=MessageResponse)
async def send_message(
    body: MessageRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    sess_result = await db.execute(
        select(ChatSession).where(ChatSession.session_token == body.session_token)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    bot_result = await db.execute(select(BotConfig).where(BotConfig.id == session.bot_config_id))
    bot = bot_result.scalar_one_or_none()

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == session.tenant_id))
    tenant = tenant_result.scalar_one()

    system_prompt = _build_chatbot_system_prompt(bot, tenant) if bot else f"You are an assistant for {tenant.name}."

    messages = list(session.messages or [])
    messages.append({"role": "user", "content": body.message, "timestamp": datetime.now(timezone.utc).isoformat()})

    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    reply = await chat_response(api_messages, system_prompt, tenant, db)

    messages.append({"role": "assistant", "content": reply, "timestamp": datetime.now(timezone.utc).isoformat()})
    session.messages = messages
    session.updated_at = datetime.now(timezone.utc)

    # Capture lead if contact info provided
    if body.visitor_email and not session.visitor_email:
        session.visitor_email = body.visitor_email
        session.visitor_name = body.visitor_name or session.visitor_name
        session.lead_captured = True

    await db.commit()
    return MessageResponse(reply=reply, lead_captured=session.lead_captured)


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.tenant_id == tenant.id)
        .order_by(desc(ChatSession.created_at))
        .limit(100)
    )
    sessions = result.scalars().all()
    return [
        SessionOut(
            id=str(s.id),
            visitor_name=s.visitor_name,
            visitor_email=s.visitor_email,
            visitor_phone=s.visitor_phone,
            message_count=len(s.messages or []),
            lead_captured=s.lead_captured,
            created_at=s.created_at.isoformat(),
        )
        for s in sessions
    ]


@router.get("/leads", response_model=list[SessionOut])
async def list_leads(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.tenant_id == tenant.id, ChatSession.lead_captured == True)
        .order_by(desc(ChatSession.created_at))
    )
    sessions = result.scalars().all()
    return [
        SessionOut(
            id=str(s.id),
            visitor_name=s.visitor_name,
            visitor_email=s.visitor_email,
            visitor_phone=s.visitor_phone,
            message_count=len(s.messages or []),
            lead_captured=s.lead_captured,
            created_at=s.created_at.isoformat(),
        )
        for s in sessions
    ]


class SessionDetailOut(BaseModel):
    id: str
    visitor_name: str | None
    visitor_email: str | None
    visitor_phone: str | None
    messages: list
    lead_captured: bool
    created_at: str


@router.get("/sessions/{session_id}", response_model=SessionDetailOut)
async def get_session(
    session_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == uuid.UUID(session_id),
            ChatSession.tenant_id == tenant.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionDetailOut(
        id=str(session.id),
        visitor_name=session.visitor_name,
        visitor_email=session.visitor_email,
        visitor_phone=session.visitor_phone,
        messages=session.messages or [],
        lead_captured=session.lead_captured,
        created_at=session.created_at.isoformat(),
    )

