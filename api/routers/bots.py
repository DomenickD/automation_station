import secrets
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.chat import BotConfig

router = APIRouter(prefix="/bots", tags=["bots"])


class BotConfigCreate(BaseModel):
    name: str
    context_data: dict
    system_prompt: str | None = None


class BotConfigOut(BaseModel):
    id: str
    name: str
    context_data: dict
    system_prompt: str | None
    embed_token: str
    is_active: bool
    created_at: str


class BotPublicOut(BaseModel):
    name: str
    system_prompt: str | None
    context_data: dict


def bot_to_out(bot: BotConfig) -> BotConfigOut:
    return BotConfigOut(
        id=str(bot.id),
        name=bot.name,
        context_data=bot.context_data,
        system_prompt=bot.system_prompt,
        embed_token=bot.embed_token,
        is_active=bot.is_active,
        created_at=bot.created_at.isoformat(),
    )


@router.get("", response_model=list[BotConfigOut])
async def list_bots(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(BotConfig).where(BotConfig.tenant_id == tenant.id))
    return [bot_to_out(b) for b in result.scalars().all()]


@router.post("", response_model=BotConfigOut)
async def create_bot(
    body: BotConfigCreate,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    bot = BotConfig(
        tenant_id=tenant.id,
        name=body.name,
        context_data=body.context_data,
        system_prompt=body.system_prompt,
        embed_token=secrets.token_urlsafe(32),
    )
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return bot_to_out(bot)


@router.put("/{bot_id}", response_model=BotConfigOut)
async def update_bot(
    bot_id: str,
    body: BotConfigCreate,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(BotConfig).where(BotConfig.id == uuid.UUID(bot_id), BotConfig.tenant_id == tenant.id)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    bot.name = body.name
    bot.context_data = body.context_data
    if body.system_prompt is not None:
        bot.system_prompt = body.system_prompt

    await db.commit()
    await db.refresh(bot)
    return bot_to_out(bot)


@router.delete("/{bot_id}", status_code=204)
async def delete_bot(
    bot_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(BotConfig).where(BotConfig.id == uuid.UUID(bot_id), BotConfig.tenant_id == tenant.id)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    await db.delete(bot)
    await db.commit()


@router.get("/{embed_token}/public", response_model=BotPublicOut)
async def get_bot_public(
    embed_token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(BotConfig).where(BotConfig.embed_token == embed_token, BotConfig.is_active == True)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or inactive")
    return BotPublicOut(
        name=bot.name,
        system_prompt=bot.system_prompt,
        context_data=bot.context_data,
    )
