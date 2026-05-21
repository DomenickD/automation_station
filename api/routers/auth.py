from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import hash_password, verify_password, create_access_token, get_current_user
from models.user import User
from models.tenant import Tenant

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_slug: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    tenant_slug: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str
    role: str
    vertical: str
    company_name: str


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == body.tenant_slug))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    user_result = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == body.email)
    )
    user = user_result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        tenant_id=str(tenant.id),
        role=user.role,
        vertical=tenant.vertical,
        company_name=tenant.name,
    )


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == body.tenant_slug))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    existing = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        tenant_id=tenant.id,
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        tenant_id=str(tenant.id),
        role=user.role,
        vertical=tenant.vertical,
        company_name=tenant.name,
    )


class MeResponse(BaseModel):
    id: str
    email: str
    name: str | None
    role: str
    tenant_id: str
    vertical: str
    company_name: str
    brand_color: str
    logo_url: str | None


@router.get("/me", response_model=MeResponse)
async def me(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one()
    return MeResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=str(tenant.id),
        vertical=tenant.vertical,
        company_name=tenant.name,
        brand_color=tenant.brand_color,
        logo_url=tenant.logo_url,
    )
