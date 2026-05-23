from typing import Annotated, Optional
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.saved_listing import SavedListing
from models.document import GeneratedDocument

router = APIRouter(prefix="/listings", tags=["listings"])

SAVED_LISTING_FIELDS = [
    "address", "bedrooms", "bathrooms", "sqft", "lot_size", "year_built",
    "price_target", "features", "neighborhood", "property_type", "property_style",
    "condition", "garage", "list_price", "target_buyer", "listing_status",
    "mls_number", "city", "state", "zip_code", "county",
    "showing_instructions", "open_house", "closing_pref", "inclusions",
    "exclusions", "lockbox", "mls_auth", "hoa", "hoa_fee", "hoa_covers",
    "schools", "flood_zone", "utilities", "updates", "property_details",
    "market_notes", "comparables", "competitors", "current_price",
    "recommended_price", "value_range", "dom", "showings", "offers",
    "feedback", "headline_feature", "ig_handle", "seller_names", "buyer_names",
    "start_date", "end_date", "commission", "buyer_commission", "special_terms",
    "seller_name", "seller_email", "seller_phone", "buyer_name", "buyer_email",
    "buyer_phone", "notes", "agent_notes", "raw_context", "last_module",
    "last_input_data", "data_enriched",
]


class SavedListingFields(BaseModel):
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size: Optional[str] = None
    year_built: Optional[int] = None
    price_target: Optional[str] = None
    features: Optional[str] = None
    neighborhood: Optional[str] = None
    property_type: Optional[str] = None
    property_style: Optional[str] = None
    condition: Optional[str] = None
    garage: Optional[str] = None
    list_price: Optional[str] = None
    target_buyer: Optional[str] = None
    listing_status: Optional[str] = None
    mls_number: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    showing_instructions: Optional[str] = None
    open_house: Optional[str] = None
    closing_pref: Optional[str] = None
    inclusions: Optional[str] = None
    exclusions: Optional[str] = None
    lockbox: Optional[str] = None
    mls_auth: Optional[str] = None
    hoa: Optional[str] = None
    hoa_fee: Optional[str] = None
    hoa_covers: Optional[str] = None
    schools: Optional[str] = None
    flood_zone: Optional[str] = None
    utilities: Optional[str] = None
    updates: Optional[str] = None
    property_details: Optional[str] = None
    market_notes: Optional[str] = None
    comparables: Optional[str] = None
    competitors: Optional[str] = None
    current_price: Optional[str] = None
    recommended_price: Optional[str] = None
    value_range: Optional[str] = None
    dom: Optional[int] = None
    showings: Optional[int] = None
    offers: Optional[str] = None
    feedback: Optional[str] = None
    headline_feature: Optional[str] = None
    ig_handle: Optional[str] = None
    seller_names: Optional[str] = None
    buyer_names: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    commission: Optional[str] = None
    buyer_commission: Optional[str] = None
    special_terms: Optional[str] = None
    seller_name: Optional[str] = None
    seller_email: Optional[str] = None
    seller_phone: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    notes: Optional[str] = None
    agent_notes: Optional[str] = None
    raw_context: Optional[str] = None
    last_module: Optional[str] = None
    last_input_data: Optional[dict] = None
    data_enriched: Optional[bool] = None


class SavedListingResponse(SavedListingFields):
    id: str
    address: str
    created_at: str
    updated_at: str


class SavedListingCreate(SavedListingFields):
    address: str


class SavedListingUpdate(SavedListingFields):
    address: Optional[str] = None


def _to_response(listing: SavedListing) -> SavedListingResponse:
    return SavedListingResponse(
        id=str(listing.id),
        **{field: getattr(listing, field) for field in SAVED_LISTING_FIELDS},
        created_at=listing.created_at.isoformat(),
        updated_at=listing.updated_at.isoformat(),
    )


@router.get("", response_model=list[SavedListingResponse])
async def list_saved_listings(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(SavedListing)
        .where(SavedListing.tenant_id == tenant.id)
        .order_by(SavedListing.updated_at.desc())
    )
    return [_to_response(r) for r in result.scalars().all()]


@router.post("", response_model=SavedListingResponse)
async def create_saved_listing(
    body: SavedListingCreate,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    address = body.address.strip()
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")

    existing = await db.execute(
        select(SavedListing).where(
            SavedListing.tenant_id == tenant.id,
            func.lower(SavedListing.address) == func.lower(address),
        )
    )
    listing = existing.scalars().first()

    if listing:
        _merge_fields(listing, body)
        listing.updated_at = datetime.now(timezone.utc)
    else:
        listing = SavedListing(
            tenant_id=tenant.id,
            user_id=user.id,
            address=address,
            **{
                field: getattr(body, field)
                for field in SAVED_LISTING_FIELDS
                if field != "address"
            },
        )
        db.add(listing)

    await db.commit()
    await db.refresh(listing)
    return _to_response(listing)


@router.get("/{listing_id}", response_model=SavedListingResponse)
async def get_saved_listing(
    listing_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    listing = await db.get(SavedListing, uuid.UUID(listing_id))
    if not listing or listing.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Listing not found")
    return _to_response(listing)


@router.put("/{listing_id}", response_model=SavedListingResponse)
async def update_saved_listing(
    listing_id: str,
    body: SavedListingUpdate,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    listing = await db.get(SavedListing, uuid.UUID(listing_id))
    if not listing or listing.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Listing not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    listing.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(listing)
    return _to_response(listing)


@router.delete("/{listing_id}", status_code=204)
async def delete_saved_listing(
    listing_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    listing = await db.get(SavedListing, uuid.UUID(listing_id))
    if not listing or listing.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Listing not found")
    await db.delete(listing)
    await db.commit()


def _merge_fields(listing: SavedListing, data) -> None:
    """Update listing fields only when the incoming value is non-null/non-empty."""
    fields = [
        field for field in SAVED_LISTING_FIELDS if field != "address"
    ]
    incoming = data.model_dump() if hasattr(data, "model_dump") else vars(data)
    for f in fields:
        v = incoming.get(f)
        if v not in (None, ""):
            setattr(listing, f, v)


class ListingDocumentOut(BaseModel):
    id: str
    module: str
    output_text: str
    tokens_used: int | None
    created_at: str


@router.get("/{listing_id}/documents", response_model=list[ListingDocumentOut])
async def get_listing_documents(
    listing_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    module: str | None = None,
    limit: int = 50,
):
    listing = await db.get(SavedListing, uuid.UUID(listing_id))
    if not listing or listing.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Listing not found")

    q = (
        select(GeneratedDocument)
        .where(
            GeneratedDocument.saved_listing_id == uuid.UUID(listing_id),
            GeneratedDocument.tenant_id == tenant.id,
        )
        .order_by(desc(GeneratedDocument.created_at))
        .limit(limit)
    )
    if module:
        q = q.where(GeneratedDocument.module == module)

    docs = (await db.execute(q)).scalars().all()
    return [
        ListingDocumentOut(
            id=str(d.id),
            module=d.module,
            output_text=d.output_text,
            tokens_used=d.tokens_used,
            created_at=d.created_at.isoformat(),
        )
        for d in docs
    ]
