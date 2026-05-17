import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    vertical: Mapped[str] = mapped_column(String(50), nullable=False)  # 'real_estate' | 'contracting'
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    api_key: Mapped[str | None] = mapped_column(Text)
    brand_color: Mapped[str] = mapped_column(String(20), default="#2563eb")
    logo_url: Mapped[str | None] = mapped_column(Text)
    system_prompt_override: Mapped[str | None] = mapped_column(Text)
    monthly_token_limit: Mapped[int] = mapped_column(Integer, default=500000)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    documents = relationship("GeneratedDocument", back_populates="tenant", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="tenant", cascade="all, delete-orphan")
    bot_configs = relationship("BotConfig", back_populates="tenant", cascade="all, delete-orphan")
    knowledge_docs = relationship("KnowledgeDocument", back_populates="tenant", cascade="all, delete-orphan")
    usage_events = relationship("UsageEvent", back_populates="tenant", cascade="all, delete-orphan")
