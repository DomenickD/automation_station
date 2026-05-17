from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.document import GeneratedDocument
from services.claude_service import generate as ai_generate
from services.comparable_research import research_comparables

router = APIRouter(prefix="/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    input_data: dict


class GenerateResponse(BaseModel):
    document_id: str
    output: str
    tokens_used: int


class ComparableResearchRequest(BaseModel):
    subject_property: str
    subject_details: str = ""
    max_results: int = 8


class ComparableCandidate(BaseModel):
    address: str = ""
    sqft: str = ""
    beds_baths: str = ""
    sale_price: str = ""
    sale_date: str = ""
    dom: str = ""
    source_title: str = ""
    source_url: str = ""
    evidence: str = ""
    selected: bool = True


class ComparableResearchResponse(BaseModel):
    candidates: list[ComparableCandidate]
    queries: list[str]
    message: str


async def _run_generation(
    module: str,
    body: GenerateRequest,
    user: User,
    tenant: Tenant,
    db: AsyncSession,
    parent_id: str | None = None,
) -> GenerateResponse:
    result = await ai_generate(module, body.input_data, tenant, user.id, db)

    doc = GeneratedDocument(
        tenant_id=tenant.id,
        user_id=user.id,
        module=module,
        input_data=body.input_data,
        output_text=result["output"],
        tokens_used=result["tokens_used"],
        parent_id=uuid.UUID(parent_id) if parent_id else None,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return GenerateResponse(
        document_id=str(doc.id),
        output=result["output"],
        tokens_used=result["tokens_used"],
    )


# ── Real Estate ──────────────────────────────────────────────────────────────

@router.post("/re/listing", response_model=GenerateResponse)
async def re_listing(
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _run_generation("re_listing", body, user, tenant, db)


@router.post("/re/email", response_model=GenerateResponse)
async def re_email(
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _run_generation("re_email", body, user, tenant, db)


@router.post("/re/cma", response_model=GenerateResponse)
async def re_cma(
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _run_generation("re_cma", body, user, tenant, db)


@router.post("/re/cma/research", response_model=ComparableResearchResponse)
async def re_cma_research(
    body: ComparableResearchRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
):
    return await research_comparables(
        body.subject_property,
        body.subject_details,
        body.max_results,
    )


# ── Contracting ──────────────────────────────────────────────────────────────

@router.post("/co/proposal", response_model=GenerateResponse)
async def co_proposal(
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _run_generation("co_proposal", body, user, tenant, db)


@router.post("/co/sow", response_model=GenerateResponse)
async def co_sow(
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _run_generation("co_sow", body, user, tenant, db)


@router.post("/co/email", response_model=GenerateResponse)
async def co_email(
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _run_generation("co_email", body, user, tenant, db)


@router.post("/co/completion", response_model=GenerateResponse)
async def co_completion(
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _run_generation("co_completion", body, user, tenant, db)


@router.post("/co/job-brief", response_model=GenerateResponse)
async def co_job_brief(
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _run_generation("co_job_brief", body, user, tenant, db)
