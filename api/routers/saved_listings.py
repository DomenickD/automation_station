from typing import Annotated, Optional
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.saved_listing import SavedListing

router = APIRouter(prefix="/listings", tags=["listings"])


class SavedListingResponse(BaseModel):
    id: str
    address: str
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size: Optional[str] = None
    year_built: Optional[int] = None
    price_target: Optional[str] = None
    features: Optional[str] = None
    neighborhood: Optional[str] = None
    seller_name: Optional[str] = None
    seller_email: Optional[str] = None
    seller_phone: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


class SavedListingCreate(BaseModel):
    address: str
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size: Optional[str] = None
    year_built: Optional[int] = None
    price_target: Optional[str] = None
    features: Optional[str] = None
    neighborhood: Optional[str] = None
    seller_name: Optional[str] = None
    seller_email: Optional[str] = None
    seller_phone: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    notes: Optional[str] = None


class SavedListingUpdate(BaseModel):
    address: Optional[str] = None
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size: Optional[str] = None
    year_built: Optional[int] = None
    price_target: Optional[str] = None
    features: Optional[str] = None
    neighborhood: Optional[str] = None
    seller_name: Optional[str] = None
    seller_email: Optional[str] = None
    seller_phone: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    notes: Optional[str] = None


def _to_response(listing: SavedListing) -> SavedListingResponse:
    return SavedListingResponse(
        id=str(listing.id),
        address=listing.address,
        bedrooms=listing.bedrooms,
        bathrooms=listing.bathrooms,
        sqft=listing.sqft,
        lot_size=listing.lot_size,
        year_built=listing.year_built,
        price_target=listing.price_target,
        features=listing.features,
        neighborhood=listing.neighborhood,
        seller_name=listing.seller_name,
        seller_email=listing.seller_email,
        seller_phone=listing.seller_phone,
        buyer_name=listing.buyer_name,
        buyer_email=listing.buyer_email,
        buyer_phone=listing.buyer_phone,
        notes=listing.notes,
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
            bedrooms=body.bedrooms,
            bathrooms=body.bathrooms,
            sqft=body.sqft,
            lot_size=body.lot_size,
            year_built=body.year_built,
            price_target=body.price_target,
            features=body.features,
            neighborhood=body.neighborhood,
            seller_name=body.seller_name,
            seller_email=body.seller_email,
            seller_phone=body.seller_phone,
            buyer_name=body.buyer_name,
            buyer_email=body.buyer_email,
            buyer_phone=body.buyer_phone,
            notes=body.notes,
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
        "bedrooms", "bathrooms", "sqft", "lot_size", "year_built",
        "price_target", "features", "neighborhood",
        "seller_name", "seller_email", "seller_phone",
        "buyer_name", "buyer_email", "buyer_phone", "notes",
    ]
    incoming = data.model_dump() if hasattr(data, "model_dump") else vars(data)
    for f in fields:
        v = incoming.get(f)
        if v not in (None, ""):
            setattr(listing, f, v)
