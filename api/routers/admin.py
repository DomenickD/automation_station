"""Super-admin routes for managing tenants and users."""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, hash_password, require_role
from models.user import User
from models.tenant import Tenant

router = APIRouter(prefix="/admin", tags=["admin"])


class TenantCreate(BaseModel):
    name: str
    vertical: str
    slug: str
    brand_color: str = "#2563eb"
    logo_url: str | None = None
    system_prompt_override: str | None = None
    monthly_token_limit: int = 500000


class TenantOut(BaseModel):
    id: str
    name: str
    vertical: str
    slug: str
    brand_color: str
    logo_url: str | None
    monthly_token_limit: int
    created_at: str


class AdminUserCreate(BaseModel):
    email: str
    password: str
    name: str | None = None
    role: str = "admin"
    tenant_id: str


@router.get("/tenants", response_model=list[TenantOut])
async def list_tenants(
    user: Annotated[User, Depends(require_role("super_admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Tenant))
    tenants = result.scalars().all()
    return [
        TenantOut(
            id=str(t.id),
            name=t.name,
            vertical=t.vertical,
            slug=t.slug,
            brand_color=t.brand_color,
            logo_url=t.logo_url,
            monthly_token_limit=t.monthly_token_limit,
            created_at=t.created_at.isoformat(),
        )
        for t in tenants
    ]


@router.post("/tenants", response_model=TenantOut)
async def create_tenant(
    body: TenantCreate,
    user: Annotated[User, Depends(require_role("super_admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    existing = await db.execute(select(Tenant).where(Tenant.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already in use")

    tenant = Tenant(**body.model_dump())
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return TenantOut(
        id=str(tenant.id),
        name=tenant.name,
        vertical=tenant.vertical,
        slug=tenant.slug,
        brand_color=tenant.brand_color,
        logo_url=tenant.logo_url,
        monthly_token_limit=tenant.monthly_token_limit,
        created_at=tenant.created_at.isoformat(),
    )


@router.post("/users", response_model=dict)
async def create_user(
    body: AdminUserCreate,
    user: Annotated[User, Depends(require_role("super_admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    new_user = User(
        tenant_id=uuid.UUID(body.tenant_id),
        email=body.email,
        name=body.name,
        role=body.role,
        hashed_password=hash_password(body.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {"id": str(new_user.id), "email": new_user.email, "role": new_user.role}


@router.get("/config/public")
async def public_config(slug: str, db: Annotated[AsyncSession, Depends(get_db)]):
    """Public endpoint — no auth — returns brand config for tenant by slug."""
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "primary_color": tenant.brand_color,
        "logo_url": tenant.logo_url,
        "vertical": tenant.vertical,
        "company_name": tenant.name,
        "slug": tenant.slug,
    }
