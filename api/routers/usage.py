from typing import Annotated
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.usage import UsageEvent

router = APIRouter(prefix="/usage", tags=["usage"])


class UsageSummary(BaseModel):
    tokens_this_month: int
    monthly_limit: int
    percent_used: float
    total_generations: int
    total_chats: int


class DailyUsage(BaseModel):
    date: str
    tokens: int
    generations: int


@router.get("/summary", response_model=UsageSummary)
async def usage_summary(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Tokens this month
    tokens_result = await db.execute(
        select(func.coalesce(func.sum(UsageEvent.tokens_used), 0))
        .where(UsageEvent.tenant_id == tenant.id, UsageEvent.created_at >= month_start)
    )
    tokens = tokens_result.scalar() or 0

    # Generation count
    gen_result = await db.execute(
        select(func.count())
        .where(
            UsageEvent.tenant_id == tenant.id,
            UsageEvent.event_type == "generation",
            UsageEvent.created_at >= month_start,
        )
    )
    generations = gen_result.scalar() or 0

    # Chat count
    chat_result = await db.execute(
        select(func.count())
        .where(
            UsageEvent.tenant_id == tenant.id,
            UsageEvent.event_type == "chat_message",
            UsageEvent.created_at >= month_start,
        )
    )
    chats = chat_result.scalar() or 0

    limit = tenant.monthly_token_limit or 500000
    return UsageSummary(
        tokens_this_month=tokens,
        monthly_limit=limit,
        percent_used=round((tokens / limit) * 100, 1) if limit else 0,
        total_generations=generations,
        total_chats=chats,
    )


@router.get("/history", response_model=list[DailyUsage])
async def usage_history(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = 30,
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(UsageEvent.created_at).label("day"),
            func.sum(UsageEvent.tokens_used).label("tokens"),
            func.count().filter(UsageEvent.event_type == "generation").label("generations"),
        )
        .where(UsageEvent.tenant_id == tenant.id, UsageEvent.created_at >= since)
        .group_by(func.date(UsageEvent.created_at))
        .order_by(func.date(UsageEvent.created_at))
    )
    return [
        DailyUsage(date=str(row.day), tokens=row.tokens or 0, generations=row.generations or 0)
        for row in result.all()
    ]
