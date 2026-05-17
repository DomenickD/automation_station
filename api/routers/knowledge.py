import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, get_current_tenant
from models.user import User
from models.tenant import Tenant
from models.knowledge import KnowledgeDocument

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class KnowledgeDocOut(BaseModel):
    id: str
    filename: str | None
    chunk_index: int
    content_preview: str
    created_at: str


@router.get("", response_model=list[KnowledgeDocOut])
async def list_knowledge(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.tenant_id == tenant.id)
    )
    docs = result.scalars().all()
    return [
        KnowledgeDocOut(
            id=str(d.id),
            filename=d.filename,
            chunk_index=d.chunk_index,
            content_preview=d.content[:200],
            created_at=d.created_at.isoformat(),
        )
        for d in docs
    ]


@router.post("/upload", response_model=list[KnowledgeDocOut])
async def upload_knowledge(
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")

    text = content.decode("utf-8", errors="ignore")

    # Simple chunking: 2000 chars per chunk
    chunk_size = 2000
    chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

    saved = []
    for i, chunk in enumerate(chunks):
        doc = KnowledgeDocument(
            tenant_id=tenant.id,
            filename=file.filename,
            content=chunk,
            chunk_index=i,
        )
        db.add(doc)
        saved.append(doc)

    await db.commit()
    for doc in saved:
        await db.refresh(doc)

    return [
        KnowledgeDocOut(
            id=str(d.id),
            filename=d.filename,
            chunk_index=d.chunk_index,
            content_preview=d.content[:200],
            created_at=d.created_at.isoformat(),
        )
        for d in saved
    ]


@router.delete("/{doc_id}", status_code=204)
async def delete_knowledge(
    doc_id: str,
    user: Annotated[User, Depends(get_current_user)],
    tenant: Annotated[Tenant, Depends(get_current_tenant)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.id == uuid.UUID(doc_id),
            KnowledgeDocument.tenant_id == tenant.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    await db.commit()
