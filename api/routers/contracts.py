import os
import uuid
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.contract import Contract
from services.claude_service import generate as ai_generate
from services.pdf_service import generate_contract_pdf
from config import settings

router = APIRouter(prefix="/contracts", tags=["contracts"])

PROMPT_MODULE_MAP = {
    "listing_agreement": "contract_listing_agreement",
    "buyer_broker": "contract_buyer_broker",
}


class ContractCreateRequest(BaseModel):
    contract_type: str
    title: str
    input_data: dict


class SignContractRequest(BaseModel):
    role: str
    name: str
    signature_data: str


class ContractOut(BaseModel):
    id: str
    contract_type: str
    title: str
    status: str
    input_data: dict
    generated_text: dict
    pdf_url: str | None
    parties: list
    signed_count: int
    required_signatures: int
    created_at: str


def parse_markdown_sections(text: str) -> dict[str, str]:
    sections = {}
    current_title = "Agreement Details"
    current_lines = []
    
    for line in text.split('\n'):
        cleaned = line.strip()
        if cleaned.startswith("##"):
            if current_lines:
                sections[current_title] = '\n'.join(current_lines).strip()
            current_title = cleaned.lstrip('#').strip()
            current_lines = []
        else:
            current_lines.append(line)
            
    if current_lines:
        sections[current_title] = '\n'.join(current_lines).strip()
        
    if not sections:
        sections["Agreement Details"] = text.strip()
        
    return sections


def init_parties(contract_type: str, input_data: dict, tenant) -> list[dict]:
    parties = []
    agent_name = input_data.get('agent_name') or input_data.get('agent') or 'Agent'
    if contract_type == 'listing_agreement':
        seller_names = input_data.get('seller_names', '') or 'Seller'
        for seller in [s.strip() for s in seller_names.split(',') if s.strip()]:
            parties.append({"role": "SELLER", "name": seller, "signed": False, "signed_at": None, "signature_data": None})
        parties.append({"role": "LISTING AGENT", "name": agent_name, "signed": False, "signed_at": None, "signature_data": None})
        brokerage = getattr(tenant, 'company_name', None) or getattr(tenant, 'name', None) or 'Brokerage'
        parties.append({"role": "BROKER", "name": brokerage, "signed": False, "signed_at": None, "signature_data": None})
    elif contract_type == 'buyer_broker':
        buyer_names = input_data.get('buyer_names', '') or 'Buyer'
        for buyer in [b.strip() for b in buyer_names.split(',') if b.strip()]:
            parties.append({"role": "BUYER", "name": buyer, "signed": False, "signed_at": None, "signature_data": None})
        parties.append({"role": "BUYER'S AGENT", "name": agent_name, "signed": False, "signed_at": None, "signature_data": None})
    else:
        parties.append({"role": "PARTY 1", "name": "Client", "signed": False, "signed_at": None, "signature_data": None})
        parties.append({"role": "AGENT", "name": agent_name, "signed": False, "signed_at": None, "signature_data": None})
    return parties


def contract_to_out(contract: Contract) -> ContractOut:
    return ContractOut(
        id=str(contract.id),
        contract_type=contract.contract_type,
        title=contract.title,
        status=contract.status,
        input_data=contract.input_data,
        generated_text=contract.generated_text,
        pdf_url=contract.pdf_url,
        parties=contract.parties or [],
        signed_count=contract.signed_count,
        required_signatures=contract.required_signatures,
        created_at=contract.created_at.isoformat(),
    )


@router.post("", response_model=ContractOut)
async def create_contract(
    body: ContractCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    prompt_module = PROMPT_MODULE_MAP.get(body.contract_type)
    if not prompt_module:
        raise HTTPException(status_code=400, detail=f"Unsupported contract type: {body.contract_type}")
    
    input_data = dict(body.input_data)
    if "agent_name" not in input_data:
        input_data["agent_name"] = user.name or "Agent"

    # Call AI generation service
    ai_result = await ai_generate(prompt_module, input_data, tenant, str(user.id), db)
    generated_text_raw = ai_result["output"]
    tokens_used = ai_result.get("tokens_used", 0)
    
    generated_sections = parse_markdown_sections(generated_text_raw)
    parties = init_parties(body.contract_type, input_data, tenant)
    
    # Render PDF
    pdf_contract_data = dict(input_data)
    pdf_contract_data["parties"] = parties
    pdf_filename = f"contract_{uuid.uuid4()}.pdf"
    
    pdf_path = generate_contract_pdf(
        contract_type=body.contract_type,
        contract_data=pdf_contract_data,
        generated_sections=generated_sections,
        tenant=tenant,
        output_filename=pdf_filename
    )
    
    pdf_url = f"/files/{pdf_filename}"
    
    contract = Contract(
        tenant_id=tenant.id,
        user_id=user.id,
        contract_type=body.contract_type,
        title=body.title,
        status="draft",
        input_data=input_data,
        generated_text=generated_sections,
        pdf_path=pdf_path,
        pdf_url=pdf_url,
        parties=parties,
        signed_count=0,
        required_signatures=len(parties),
        tokens_used=tokens_used,
    )
    db.add(contract)
    await db.commit()
    await db.refresh(contract)
    
    return contract_to_out(contract)


@router.get("", response_model=list[ContractOut])
async def list_contracts(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Contract)
        .where(Contract.tenant_id == tenant.id)
        .order_by(desc(Contract.created_at))
    )
    contracts = result.scalars().all()
    return [contract_to_out(c) for c in contracts]


@router.get("/{contract_id}", response_model=ContractOut)
async def get_contract(
    contract_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Contract).where(
            Contract.id == uuid.UUID(contract_id),
            Contract.tenant_id == tenant.id
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract_to_out(contract)


@router.post("/{contract_id}/sign", response_model=ContractOut)
async def sign_contract(
    contract_id: str,
    body: SignContractRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Contract).where(
            Contract.id == uuid.UUID(contract_id),
            Contract.tenant_id == tenant.id
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    party_found = False
    updated_parties = []
    
    for p in (contract.parties or []):
        role_match = p.get("role", "").strip().upper() == body.role.strip().upper()
        name_match = p.get("name", "").strip().upper() == body.name.strip().upper()
        
        if role_match and name_match and not p.get("signed"):
            p["signed"] = True
            p["signed_at"] = datetime.now(timezone.utc).isoformat()
            p["signature_data"] = body.signature_data
            party_found = True
        updated_parties.append(p)
        
    if not party_found:
        raise HTTPException(status_code=400, detail="Matching unsigned party not found")
        
    contract.parties = updated_parties
    contract.signed_count = sum(1 for p in updated_parties if p.get("signed"))
    
    if contract.signed_count >= contract.required_signatures:
        contract.status = "signed"
        
    # Regenerate PDF with updated signature details
    pdf_contract_data = dict(contract.input_data)
    pdf_contract_data["parties"] = contract.parties
    
    filename = os.path.basename(contract.pdf_path) if contract.pdf_path else f"contract_{uuid.uuid4()}.pdf"
    
    pdf_path = generate_contract_pdf(
        contract_type=contract.contract_type,
        contract_data=pdf_contract_data,
        generated_sections=contract.generated_text,
        tenant=tenant,
        output_filename=filename
    )
    contract.pdf_path = pdf_path
    contract.pdf_url = f"/files/{filename}"
    
    flag_modified(contract, "parties")
    
    await db.commit()
    await db.refresh(contract)
    
    return contract_to_out(contract)


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(
    contract_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Contract).where(
            Contract.id == uuid.UUID(contract_id),
            Contract.tenant_id == tenant.id
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    # Also clean up the PDF file if it exists
    if contract.pdf_path and os.path.exists(contract.pdf_path):
        try:
            os.remove(contract.pdf_path)
        except Exception:
            pass
            
    await db.delete(contract)
    await db.commit()
