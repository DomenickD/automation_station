from typing import Annotated
import uuid
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.document import GeneratedDocument
from models.saved_listing import SavedListing
from services.claude_service import generate as ai_generate
from services.comparable_research import research_comparables
from services.neighborhood_research import research_neighborhood
from services.prompt_builder import PROMPT_REGISTRY

router = APIRouter(prefix="/generate", tags=["generate"])

REAL_ESTATE_MODULE_ROUTES = {
    "listing": "re_listing",
    "email": "re_email",
    "cma": "re_cma",
    "rpr": "re_rpr",
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
    is_subject_property: bool = False
    similarity_score: float = 0


class ComparableResearchResponse(BaseModel):
    candidates: list[ComparableCandidate]
    queries: list[str]
    message: str
    market_notes: str = ""


_RE_MODULES = set(REAL_ESTATE_MODULE_ROUTES.values())
_SAVED_LISTING_MODULES = _RE_MODULES | {"contract_listing_agreement"}

# Maps module name → which input_data key holds the property address
_ADDRESS_KEYS = {
    "re_listing": "address",
    "re_email": "property_address",
    "re_cma": "subject_property",
}

# For most generic RE modules, the address field is just "address"
_GENERIC_ADDRESS_KEY = "address"

_SAVED_LISTING_FIELD_ALIASES = {
    "bedrooms": ["bedrooms", "beds"],
    "bathrooms": ["bathrooms", "baths"],
    "sqft": ["sqft", "square_feet"],
    "lot_size": ["lot_size"],
    "year_built": ["year_built"],
    "price_target": ["price_target", "price_range"],
    "list_price": ["list_price", "price"],
    "target_buyer": ["target_buyer"],
    "features": ["features"],
    "neighborhood": ["neighborhood", "location", "target_areas"],
    "property_type": ["property_type"],
    "property_style": ["property_style", "style"],
    "condition": ["condition"],
    "garage": ["garage"],
    "listing_status": ["listing_status", "announcement_type", "lead_type"],
    "mls_number": ["mls_number"],
    "city": ["city"],
    "state": ["state"],
    "zip_code": ["zip_code", "zip"],
    "county": ["county"],
    "showing_instructions": ["showing_instructions"],
    "open_house": ["open_house"],
    "closing_pref": ["closing_pref"],
    "inclusions": ["inclusions"],
    "exclusions": ["exclusions"],
    "lockbox": ["lockbox"],
    "mls_auth": ["mls_auth"],
    "hoa": ["hoa"],
    "hoa_fee": ["hoa_fee"],
    "hoa_covers": ["hoa_covers"],
    "schools": ["schools"],
    "flood_zone": ["flood_zone"],
    "utilities": ["utilities"],
    "updates": ["updates"],
    "property_details": ["property_details", "subject_details", "specs"],
    "market_notes": ["market_notes"],
    "comparables": ["comparables"],
    "competitors": ["competitors"],
    "current_price": ["current_price", "original_price"],
    "recommended_price": ["recommended_price"],
    "value_range": ["value_range"],
    "dom": ["dom"],
    "showings": ["showings", "showing_count"],
    "offers": ["offers"],
    "feedback": ["feedback"],
    "headline_feature": ["headline_feature"],
    "ig_handle": ["ig_handle"],
    "seller_names": ["seller_names", "seller_name"],
    "buyer_names": ["buyer_names", "buyer_name"],
    "seller_name": ["seller_name", "owner_name"],
    "seller_email": ["seller_email"],
    "seller_phone": ["seller_phone"],
    "buyer_name": ["buyer_name"],
    "buyer_email": ["buyer_email"],
    "buyer_phone": ["buyer_phone"],
    "start_date": ["start_date"],
    "end_date": ["end_date"],
    "commission": ["commission"],
    "buyer_commission": ["buyer_commission"],
    "special_terms": ["special_terms"],
    "notes": ["notes"],
    "agent_notes": ["agent_notes"],
    "raw_context": ["context", "extra_details", "differentiator"],
}

_INTEGER_FIELDS = {"sqft", "year_built", "dom", "showings"}
_FLOAT_FIELDS = {"bedrooms", "bathrooms"}


def _number_from_match(match: re.Match | None, integer: bool = False):
    if not match:
        return None
    try:
        value = float(match.group(1).replace(",", ""))
        return int(value) if integer else value
    except (TypeError, ValueError):
        return None


def _parse_property_specs(text: str | None) -> dict:
    """Extract structured listing details from compact specs text."""
    if not text:
        return {}

    value = str(text)
    lower = value.lower()
    parsed = {
        "bedrooms": _number_from_match(re.search(r"(\d+(?:\.\d+)?)\s*(?:br|bd|bed|beds|bedroom|bedrooms)\b", lower)),
        "bathrooms": _number_from_match(re.search(r"(\d+(?:\.\d+)?)\s*(?:ba|bath|baths|bathroom|bathrooms)\b", lower)),
        "sqft": _number_from_match(re.search(r"([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)\b", lower), integer=True),
        "year_built": _number_from_match(re.search(r"(?:built|year built)\D*(\d{4})", lower), integer=True),
    }
    slash_specs = re.search(r"\b(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\b", lower)
    if slash_specs:
        try:
            parsed["bedrooms"] = parsed["bedrooms"] or float(slash_specs.group(1))
            parsed["bathrooms"] = parsed["bathrooms"] or float(slash_specs.group(2))
        except (TypeError, ValueError):
            pass

    property_types = ["single family", "condo", "townhouse", "multi-family", "villa", "land"]
    conditions = ["original", "updated", "fully renovated", "new construction"]

    for option in property_types:
        if option in lower:
            parsed["property_type"] = option.title()
            break

    for option in conditions:
        if option in lower:
            parsed["condition"] = option.title()
            break

    garage = re.search(r"(\d+\+?)[-\s]*(?:car\s*)?garage", lower)
    if garage:
        parsed["garage"] = f"{garage.group(1)}-Car"

    return {key: val for key, val in parsed.items() if val not in (None, "")}


async def _upsert_saved_listing(
    module: str,
    input_data: dict,
    user: User,
    tenant: Tenant,
    db: AsyncSession,
) -> "SavedListing | None":
    address_key = _ADDRESS_KEYS.get(module, _GENERIC_ADDRESS_KEY)
    address = (input_data.get(address_key) or "").strip()
    if not address:
        return None

    existing = await db.execute(
        select(SavedListing).where(
            SavedListing.tenant_id == tenant.id,
            func.lower(SavedListing.address) == func.lower(address),
        )
    )
    listing = existing.scalars().first()

    def _val(key):
        v = input_data.get(key)
        return v if v not in (None, "") else None

    def _first_value(keys):
        for key in keys:
            value = _val(key)
            if value is not None:
                return value
        return None

    def _coerce_field(field, value):
        if value is None:
            return None
        if field in _INTEGER_FIELDS:
            try:
                return int(float(value))
            except (TypeError, ValueError):
                return None
        if field in _FLOAT_FIELDS:
            try:
                return float(value)
            except (TypeError, ValueError):
                return None
        if isinstance(value, list):
            return "\n".join(str(item) for item in value)
        if isinstance(value, dict):
            return str(value)
        return value

    updates = {
        field: _coerce_field(field, _first_value(aliases))
        for field, aliases in _SAVED_LISTING_FIELD_ALIASES.items()
    }
    spec_text = _first_value(["specs", "subject_details", "property_details", "details"])
    for field, value in _parse_property_specs(spec_text).items():
        if updates.get(field) is None:
            updates[field] = value
    if spec_text and updates.get("property_details") is None:
        updates["property_details"] = spec_text

    updates["last_module"] = module
    updates["last_input_data"] = input_data
    updates["data_enriched"] = True

    if listing:
        for field, value in updates.items():
            if value is not None:
                setattr(listing, field, value)
        listing.updated_at = datetime.now(timezone.utc)
    else:
        listing = SavedListing(
            tenant_id=tenant.id,
            user_id=user.id,
            address=address,
            **updates,
        )
        db.add(listing)

    return listing


async def _run_generation(
    module: str,
    body: GenerateRequest,
    user: User,
    tenant: Tenant,
    db: AsyncSession,
    parent_id: str | None = None,
) -> GenerateResponse:
    result = await ai_generate(module, body.input_data, tenant, user.id, db)

    saved_listing = None
    if module in _SAVED_LISTING_MODULES:
        saved_listing = await _upsert_saved_listing(module, body.input_data, user, tenant, db)
        if saved_listing and saved_listing.id is None:
            await db.flush()  # ensure listing gets an ID before linking

    doc = GeneratedDocument(
        tenant_id=tenant.id,
        user_id=user.id,
        module=module,
        input_data=body.input_data,
        output_text=result["output"],
        tokens_used=result["tokens_used"],
        parent_id=uuid.UUID(parent_id) if parent_id else None,
        saved_listing_id=saved_listing.id if saved_listing else None,
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
    try:
        return await research_comparables(
            body.subject_property,
            body.subject_details,
            body.max_results,
        )
    except Exception as exc:
        return ComparableResearchResponse(
            candidates=[],
            queries=[],
            message=f"Comparable research could not complete: {exc}",
            market_notes="",
        )


class NeighborhoodResearchRequest(BaseModel):
    address: str = ""
    neighborhood: str = ""
    location: str = ""


@router.post("/re/neighborhood/research")
async def re_neighborhood_research(
    body: NeighborhoodResearchRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
):
    try:
        return await research_neighborhood(
            address=body.address,
            neighborhood=body.neighborhood,
            location=body.location,
        )
    except Exception as exc:
        return {
            "neighborhood": body.neighborhood,
            "location": body.location,
            "property_type": "",
            "price_range": "",
            "agent_notes": "",
            "message": f"Research could not complete: {exc}",
        }


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
