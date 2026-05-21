import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from models.usage import UsageEvent


async def track_usage(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID | None,
    event_type: str,
    module: str | None,
    tokens: int,
    db: AsyncSession,
) -> None:
    event = UsageEvent(
        tenant_id=tenant_id,
        user_id=user_id,
        event_type=event_type,
        module=module,
        tokens_used=tokens,
    )
    db.add(event)
