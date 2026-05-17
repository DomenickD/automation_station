from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.document import GeneratedDocument
from services.claude_service import generate as ai_generate

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentOut(BaseModel):
    id: str
    module: str
    input_data: dict
    output_text: str
    tokens_used: int | None
    version: int
    parent_id: str | None
    created_at: str


class RegenerateRequest(BaseModel):
    input_data: dict | None = None


def doc_to_out(doc: GeneratedDocument) -> DocumentOut:
    return DocumentOut(
        id=str(doc.id),
        module=doc.module,
        input_data=doc.input_data,
        output_text=doc.output_text,
        tokens_used=doc.tokens_used,
        version=doc.version,
        parent_id=str(doc.parent_id) if doc.parent_id else None,
        created_at=doc.created_at.isoformat(),
    )


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    module: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    q = select(GeneratedDocument).where(GeneratedDocument.tenant_id == tenant.id)
    if module:
        q = q.where(GeneratedDocument.module == module)
    q = q.order_by(desc(GeneratedDocument.created_at)).limit(limit).offset(offset)
    result = await db.execute(q)
    return [doc_to_out(d) for d in result.scalars().all()]


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(
    doc_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == uuid.UUID(doc_id),
            GeneratedDocument.tenant_id == tenant.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc_to_out(doc)


@router.post("/{doc_id}/regenerate", response_model=DocumentOut)
async def regenerate_document(
    doc_id: str,
    body: RegenerateRequest,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == uuid.UUID(doc_id),
            GeneratedDocument.tenant_id == tenant.id,
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Document not found")

    input_data = body.input_data or original.input_data
    ai_result = await ai_generate(original.module, input_data, tenant, user.id, db)

    new_doc = GeneratedDocument(
        tenant_id=tenant.id,
        user_id=user.id,
        module=original.module,
        input_data=input_data,
        output_text=ai_result["output"],
        tokens_used=ai_result["tokens_used"],
        version=original.version + 1,
        parent_id=original.id,
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    return doc_to_out(new_doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == uuid.UUID(doc_id),
            GeneratedDocument.tenant_id == tenant.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    await db.commit()
