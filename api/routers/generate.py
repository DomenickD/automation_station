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
from services.prompt_builder import PROMPT_REGISTRY

router = APIRouter(prefix="/generate", tags=["generate"])

REAL_ESTATE_MODULE_ROUTES = {
    "listing": "re_listing",
    "email": "re_email",
    "cma": "re_cma",
    "neighborhood": "re_neighborhood",
    "appointment": "re_appointment",
    "competitive": "re_competitive",
    "timeline": "re_timeline",
    "seller-update": "re_seller_update",
    "buyer-consult": "re_buyer_consult",
    "offer-letter": "re_offer_letter",
    "expired-outreach": "re_expired_outreach",
    "soi-campaign": "re_soi_campaign",
    "just-listed": "re_just_listed",
    "open-house-followup": "re_open_house_followup",
    "virtual-staging": "re_virtual_staging",
    "property-faq": "re_property_faq",
    "price-reduction": "re_price_reduction",
    "business-plan": "re_business_plan",
    "bio": "re_bio",
    "testimonial": "re_testimonial",
    "referral": "re_referral",
}

CONTRACT_MODULE_ROUTES = {
    "listing-agreement": "contract_listing_agreement",
    "buyer-broker": "contract_buyer_broker",
}


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


@router.post("/re/{module_slug}", response_model=GenerateResponse)
async def re_module(
    module_slug: str,
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    module = REAL_ESTATE_MODULE_ROUTES.get(module_slug)
    if not module or module not in PROMPT_REGISTRY:
        raise HTTPException(status_code=404, detail="Unknown real estate module")
    return await _run_generation(module, body, user, tenant, db)


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


@router.post("/contracts/{module_slug}", response_model=GenerateResponse)
async def contract_module(
    module_slug: str,
    body: GenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    module = CONTRACT_MODULE_ROUTES.get(module_slug)
    if not module or module not in PROMPT_REGISTRY:
        raise HTTPException(status_code=404, detail="Unknown contract module")
    return await _run_generation(module, body, user, tenant, db)
