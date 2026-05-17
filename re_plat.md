# Claude Automation Platform — Real Estate
## Master Build Document for Claude Code

**Stack:** React (Vite) · FastAPI · PostgreSQL · Railway  
**AI Engine:** Anthropic Claude API (`claude-sonnet-4-5`)  
**PDF Engine:** ReportLab + pypdf  
**Target:** Multi-tenant SaaS for real estate small businesses

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Database Schema](#2-database-schema)
3. [Environment & Config](#3-environment--config)
4. [FastAPI Backend](#4-fastapi-backend)
5. [Claude Service & Prompt System](#5-claude-service--prompt-system)
6. [PDF Generation System](#6-pdf-generation-system)
7. [Module Definitions — All Features](#7-module-definitions--all-features)
8. [React Frontend](#8-react-frontend)
9. [Railway Deployment](#9-railway-deployment)
10. [Build Order](#10-build-order)

---

## 1. Project Structure

```
claude-re-platform/
├── api/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── migrations/
│   ├── models/
│   │   ├── __init__.py
│   │   ├── tenant.py
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── chat.py
│   │   ├── lead.py
│   │   └── usage.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── generate.py
│   │   ├── contracts.py
│   │   ├── chat.py
│   │   ├── documents.py
│   │   ├── leads.py
│   │   ├── bots.py
│   │   ├── knowledge.py
│   │   ├── usage.py
│   │   └── admin.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── claude_service.py
│   │   ├── prompt_builder.py
│   │   ├── pdf_service.py
│   │   ├── contract_pdf.py
│   │   └── usage_tracker.py
│   └── middleware/
│       ├── __init__.py
│       └── tenant.py
├── web/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       │   └── client.js
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── TenantContext.jsx
│       ├── hooks/
│       │   ├── useGenerate.js
│       │   ├── useDocuments.js
│       │   └── useTenant.js
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx
│       │   │   ├── Header.jsx
│       │   │   └── Layout.jsx
│       │   ├── shared/
│       │   │   ├── GeneratorForm.jsx
│       │   │   ├── OutputCard.jsx
│       │   │   ├── ChatWidget.jsx
│       │   │   ├── UsageBar.jsx
│       │   │   ├── PDFPreview.jsx
│       │   │   └── FieldBuilder.jsx
│       │   └── ui/
│       │       ├── Button.jsx
│       │       ├── Input.jsx
│       │       ├── Select.jsx
│       │       ├── Textarea.jsx
│       │       ├── Card.jsx
│       │       ├── Badge.jsx
│       │       └── Spinner.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── contracts/
│           │   ├── ContractBuilder.jsx
│           │   ├── ContractList.jsx
│           │   └── ContractView.jsx
│           ├── listings/
│           │   ├── ListingGenerator.jsx
│           │   ├── PropertyFAQ.jsx
│           │   └── VirtualStaging.jsx
│           ├── market/
│           │   ├── NeighborhoodReport.jsx
│           │   ├── ListingAppointment.jsx
│           │   ├── CompetitiveAnalysis.jsx
│           │   └── PriceReduction.jsx
│           ├── clients/
│           │   ├── TransactionTimeline.jsx
│           │   ├── SellerUpdate.jsx
│           │   ├── BuyerConsultation.jsx
│           │   └── OfferLetter.jsx
│           ├── leads/
│           │   ├── ExpiredFSBO.jsx
│           │   ├── SphereOfInfluence.jsx
│           │   ├── JustListedSold.jsx
│           │   └── OpenHouseFollowUp.jsx
│           ├── agent/
│           │   ├── BusinessPlan.jsx
│           │   ├── BioWriter.jsx
│           │   ├── TestimonialSystem.jsx
│           │   └── ReferralThankYou.jsx
│           ├── bots/
│           │   ├── BotManager.jsx
│           │   └── BotEmbed.jsx
│           ├── knowledge/
│           │   └── KnowledgeBase.jsx
│           └── admin/
│               ├── UsageDashboard.jsx
│               └── Settings.jsx
├── railway.toml
├── .env.example
└── README.md
```

---

## 2. Database Schema

Run all of this as the initial Alembic migration.

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    vertical TEXT NOT NULL DEFAULT 'real_estate',
    brand_color TEXT DEFAULT '#2563eb',
    brand_color_secondary TEXT DEFAULT '#1e40af',
    logo_url TEXT,
    company_name TEXT,
    license_number TEXT,
    brokerage_name TEXT,
    brokerage_address TEXT,
    phone TEXT,
    website TEXT,
    -- Agent brand voice: uploaded once at onboarding, injected into every prompt
    brand_voice TEXT,
    -- Custom system prompt suffix (advanced override)
    system_prompt_override TEXT,
    -- Usage limits
    monthly_token_limit INT DEFAULT 1000000,
    tokens_used_this_month INT DEFAULT 0,
    token_reset_date DATE DEFAULT CURRENT_DATE,
    -- Subscription
    plan TEXT DEFAULT 'starter',       -- 'starter' | 'growth' | 'enterprise'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    title TEXT,                        -- "REALTOR®", "Broker Associate", etc.
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',          -- 'superadmin' | 'admin' | 'user'
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ─────────────────────────────────────────
-- GENERATED DOCUMENTS (all AI text outputs)
-- ─────────────────────────────────────────
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    -- Module identifier
    module TEXT NOT NULL,
    -- e.g. 're_listing' | 're_cma' | 're_email' | 're_contract' |
    --      're_neighborhood' | 're_appointment' | 're_competitive' |
    --      're_timeline' | 're_seller_update' | 're_buyer_consult' |
    --      're_offer_letter' | 're_expired_outreach' | 're_soi_campaign' |
    --      're_just_listed' | 're_open_house' | 're_virtual_staging' |
    --      're_property_faq' | 're_price_reduction' | 're_business_plan' |
    --      're_bio' | 're_testimonial' | 're_referral'
    module_label TEXT,                 -- Human readable: "Listing Description"
    title TEXT,                        -- User-defined label for this doc
    input_data JSONB NOT NULL,         -- All form inputs, stored for regen
    output_text TEXT NOT NULL,         -- Raw Claude output
    output_sections JSONB,             -- Parsed sections {short_desc, long_desc, ...}
    model TEXT DEFAULT 'claude-sonnet-4-5',
    tokens_input INT DEFAULT 0,
    tokens_output INT DEFAULT 0,
    version INT DEFAULT 1,
    parent_id UUID REFERENCES generated_documents(id),
    is_favorite BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CONTRACTS (separate from docs — have PDF state)
-- ─────────────────────────────────────────
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    contract_type TEXT NOT NULL,
    -- 'listing_agreement' | 'buyer_broker' | 'offer_to_purchase' |
    -- 'seller_disclosure' | 'lease_agreement' | 'commission_agreement' |
    -- 'as_is_cover_sheet'
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft',       -- 'draft' | 'sent' | 'signed' | 'void'
    input_data JSONB NOT NULL,         -- All form fields
    generated_text JSONB NOT NULL,     -- Claude-drafted sections
    pdf_path TEXT,                     -- Stored PDF path on Railway volume or S3
    pdf_url TEXT,                      -- Signed URL for download
    -- Signature tracking
    parties JSONB DEFAULT '[]',
    -- [{name, email, role, signed_at, signature_data}]
    signed_count INT DEFAULT 0,
    required_signatures INT DEFAULT 2,
    tokens_input INT DEFAULT 0,
    tokens_output INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- BOT CONFIGS (embeddable chatbots)
-- ─────────────────────────────────────────
CREATE TABLE bot_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bot_type TEXT DEFAULT 'property',  -- 'property' | 'general' | 'internal'
    context_data JSONB NOT NULL,       -- Property details or business FAQ data
    system_prompt TEXT,                -- Generated at save time from context_data
    embed_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    -- Display config
    greeting_message TEXT DEFAULT 'Hi! I can answer questions about this property. What would you like to know?',
    bot_name TEXT DEFAULT 'Property Assistant',
    theme_color TEXT DEFAULT '#2563eb',
    is_active BOOLEAN DEFAULT TRUE,
    -- Stats
    total_sessions INT DEFAULT 0,
    total_leads INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CHAT SESSIONS
-- ─────────────────────────────────────────
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bot_config_id UUID REFERENCES bot_configs(id),
    session_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    -- Visitor info (captured during chat)
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    visitor_notes TEXT,                -- What they're looking for
    -- Conversation
    messages JSONB DEFAULT '[]',
    -- [{role: 'user'|'assistant', content: '', timestamp: ''}]
    message_count INT DEFAULT 0,
    -- Lead status
    lead_captured BOOLEAN DEFAULT FALSE,
    lead_score TEXT,                   -- 'hot' | 'warm' | 'cold' | null
    -- Meta
    referrer_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- LEADS (captured from chatbots + open house)
-- ─────────────────────────────────────────
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source TEXT NOT NULL,              -- 'chatbot' | 'open_house' | 'form'
    source_id UUID,                    -- chat_session_id or upload batch id
    name TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    property_interest TEXT,
    timeline TEXT,
    budget_range TEXT,
    status TEXT DEFAULT 'new',         -- 'new' | 'contacted' | 'qualified' | 'closed'
    assigned_to UUID REFERENCES users(id),
    follow_up_drafted BOOLEAN DEFAULT FALSE,
    follow_up_doc_id UUID REFERENCES generated_documents(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- KNOWLEDGE BASE (internal bot docs)
-- ─────────────────────────────────────────
CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT,                    -- 'pdf' | 'txt' | 'docx'
    content TEXT NOT NULL,             -- Full extracted text
    chunk_index INT DEFAULT 0,
    total_chunks INT DEFAULT 1,
    word_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- USAGE EVENTS
-- ─────────────────────────────────────────
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    event_type TEXT NOT NULL,          -- 'generation' | 'chat' | 'contract' | 'export'
    module TEXT,
    tokens_input INT DEFAULT 0,
    tokens_output INT DEFAULT 0,
    tokens_total INT GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
    cost_usd NUMERIC(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_generated_documents_tenant ON generated_documents(tenant_id);
CREATE INDEX idx_generated_documents_module ON generated_documents(tenant_id, module);
CREATE INDEX idx_generated_documents_created ON generated_documents(created_at DESC);
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_status ON contracts(tenant_id, status);
CREATE INDEX idx_chat_sessions_bot ON chat_sessions(bot_config_id);
CREATE INDEX idx_leads_tenant ON leads(tenant_id, status);
CREATE INDEX idx_usage_events_tenant_date ON usage_events(tenant_id, created_at DESC);
```

---

## 3. Environment & Config

### `.env.example`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/re_platform

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Auth
SECRET_KEY=your-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# App
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.up.railway.app
BASE_URL=http://localhost:8000

# File storage (Railway volume path)
UPLOAD_DIR=/data/uploads
PDF_OUTPUT_DIR=/data/pdfs
```

### `api/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    anthropic_api_key: str
    secret_key: str
    access_token_expire_minutes: int = 10080
    environment: str = "development"
    allowed_origins: list[str] = ["http://localhost:5173"]
    base_url: str = "http://localhost:8000"
    upload_dir: str = "/data/uploads"
    pdf_output_dir: str = "/data/pdfs"

    # Claude model to use everywhere
    claude_model: str = "claude-sonnet-4-5"
    claude_max_tokens: int = 4096

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 4. FastAPI Backend

### `api/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from config import settings
from database import engine, Base
from routers import auth, generate, contracts, chat, documents, leads, bots, knowledge, usage, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create storage dirs on startup
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.pdf_output_dir, exist_ok=True)
    yield

app = FastAPI(
    title="Claude RE Platform API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated PDFs as static files
app.mount("/files", StaticFiles(directory=settings.pdf_output_dir), name="files")

# Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(generate.router, prefix="/generate", tags=["generate"])
app.include_router(contracts.router, prefix="/contracts", tags=["contracts"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(leads.router, prefix="/leads", tags=["leads"])
app.include_router(bots.router, prefix="/bots", tags=["bots"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
app.include_router(usage.router, prefix="/usage", tags=["usage"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### All API Endpoints

```
# AUTH
POST   /auth/login
POST   /auth/register
POST   /auth/refresh
GET    /auth/me
PUT    /auth/me
POST   /auth/change-password

# GENERATION — Real Estate
POST   /generate/re/listing              # Listing description
POST   /generate/re/cma                  # CMA narrative
POST   /generate/re/email                # Email drafter (type param)
POST   /generate/re/neighborhood         # Neighborhood report
POST   /generate/re/appointment          # Listing appointment deck
POST   /generate/re/competitive          # Competitive analysis brief
POST   /generate/re/timeline             # Transaction timeline email sequence
POST   /generate/re/seller-update        # Weekly seller update
POST   /generate/re/buyer-consult        # Buyer consultation summary
POST   /generate/re/offer-letter         # Buyer offer letter to seller
POST   /generate/re/expired-outreach     # Expired/FSBO sequence
POST   /generate/re/soi-campaign         # Sphere of influence campaign
POST   /generate/re/just-listed          # Just listed/sold announcement suite
POST   /generate/re/open-house-followup  # Open house follow-up batch
POST   /generate/re/virtual-staging      # Virtual staging descriptions
POST   /generate/re/property-faq         # Property FAQ document
POST   /generate/re/price-reduction      # Price reduction memo
POST   /generate/re/business-plan        # Annual business plan
POST   /generate/re/bio                  # Agent bio (3 versions)
POST   /generate/re/testimonial          # Testimonial polish
POST   /generate/re/referral             # Referral thank-you

# CONTRACTS
POST   /contracts                        # Generate + create contract
GET    /contracts                        # List contracts
GET    /contracts/{id}                   # Get contract
PUT    /contracts/{id}                   # Update contract
DELETE /contracts/{id}
GET    /contracts/{id}/pdf               # Download PDF
POST   /contracts/{id}/regenerate        # Regenerate sections
POST   /contracts/{id}/send              # Send for signature (future)

# DOCUMENTS (history)
GET    /documents                        # List all generated docs
GET    /documents/{id}
POST   /documents/{id}/regenerate
DELETE /documents/{id}
PUT    /documents/{id}/favorite
GET    /documents/export/{id}            # Export as .txt

# CHAT (public — no auth)
POST   /chat/session                     # Start session
POST   /chat/message                     # Send message
GET    /chat/session/{token}             # Get session state

# CHAT (admin — requires auth)
GET    /chat/sessions                    # List sessions for tenant
GET    /chat/sessions/{id}

# LEADS
GET    /leads                            # List leads
GET    /leads/{id}
PUT    /leads/{id}                       # Update status/notes
POST   /leads/{id}/draft-followup        # Generate follow-up for this lead
POST   /leads/import                     # Bulk import (open house CSV)

# BOTS
GET    /bots
POST   /bots
GET    /bots/{id}
PUT    /bots/{id}
DELETE /bots/{id}
GET    /bots/public/{embed_token}        # Public — no auth, returns bot config
POST   /bots/{id}/regenerate-prompt      # Rebuild system prompt from context

# KNOWLEDGE BASE
POST   /knowledge/upload                 # Upload file, extract text
GET    /knowledge                        # List docs
DELETE /knowledge/{id}
POST   /knowledge/query                  # Query knowledge base (internal bot)

# USAGE
GET    /usage/summary                    # Tokens this month, cost estimate
GET    /usage/daily                      # Daily breakdown (last 30 days)
GET    /usage/by-module                  # Usage breakdown by module

# ADMIN (superadmin only)
GET    /admin/tenants
POST   /admin/tenants
GET    /admin/tenants/{id}
PUT    /admin/tenants/{id}
GET    /admin/usage/all                  # All tenant usage
```

---

## 5. Claude Service & Prompt System

### `api/services/claude_service.py`

```python
import anthropic
from config import settings
from .prompt_builder import build_prompt
from .usage_tracker import track_usage

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

async def generate(
    module: str,
    input_data: dict,
    tenant,
    user_id: str,
    db,
    max_tokens: int = None
) -> dict:
    system_prompt, user_prompt = build_prompt(module, input_data, tenant)

    response = client.messages.create(
        model=settings.claude_model,
        max_tokens=max_tokens or settings.claude_max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )

    output = response.content[0].text
    tokens_in = response.usage.input_tokens
    tokens_out = response.usage.output_tokens

    await track_usage(
        db=db,
        tenant_id=tenant.id,
        user_id=user_id,
        event_type="generation",
        module=module,
        tokens_input=tokens_in,
        tokens_output=tokens_out
    )

    return {
        "output": output,
        "tokens_input": tokens_in,
        "tokens_output": tokens_out
    }


async def chat_turn(
    messages: list,
    bot_system_prompt: str,
    tenant,
    db
) -> str:
    response = client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        system=bot_system_prompt,
        messages=messages
    )

    await track_usage(
        db=db,
        tenant_id=tenant.id,
        user_id=None,
        event_type="chat",
        module="chatbot",
        tokens_input=response.usage.input_tokens,
        tokens_output=response.usage.output_tokens
    )

    return response.content[0].text
```

### `api/services/prompt_builder.py`

```python
"""
Prompt builder for all modules.

Every prompt has 4 layers:
  1. Role & platform context
  2. Tenant brand voice (from DB)
  3. Format instructions for this module
  4. Input data injection

Prompts return (system_prompt: str, user_prompt: str)
"""

def build_prompt(module: str, input_data: dict, tenant) -> tuple[str, str]:
    builder = PROMPT_REGISTRY.get(module)
    if not builder:
        raise ValueError(f"Unknown module: {module}")
    return builder(input_data, tenant)


def _base_system(tenant, role: str, format_instructions: str) -> str:
    brand_voice = tenant.brand_voice or "Professional, warm, and knowledgeable."
    company = tenant.company_name or tenant.name
    brokerage = f" at {tenant.brokerage_name}" if tenant.brokerage_name else ""

    base = f"""You are an AI assistant for {company}{brokerage}, a real estate business.
Your role: {role}

Brand voice and writing style:
{brand_voice}

{format_instructions}

Critical rules:
- Never fabricate specific facts, statistics, or data not provided in the input
- If a field is missing or empty, omit that section naturally — do not invent content
- Keep all output in the agent's brand voice as defined above
- Use plain, client-friendly language unless the context is agent-to-agent
- Do not include any preamble like "Here is your listing description:" — output the content directly
"""
    if tenant.system_prompt_override:
        base += f"\nAdditional instructions:\n{tenant.system_prompt_override}"

    return base


# ─────────────────────────────────────────
# MODULE PROMPT BUILDERS
# ─────────────────────────────────────────

def _re_listing(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate professional real estate listing descriptions",
        format_instructions="""Return exactly this structure with these headers:
## SHORT DESCRIPTION
[MLS-ready, 150-200 words]

## LONG DESCRIPTION
[Full marketing copy, 350-500 words]

## SOCIAL CAPTION
[Instagram/Facebook caption, 3-5 sentences with 5-8 hashtags]

## EMAIL TEASER
Subject: [subject line]
[3-sentence preview for email campaigns]"""
    )
    user = f"""Generate listing content for this property:

Address: {data.get('address', 'Not provided')}
Bedrooms: {data.get('bedrooms')} | Bathrooms: {data.get('bathrooms')} | Sqft: {data.get('sqft')}
Lot Size: {data.get('lot_size', 'Not specified')}
Year Built: {data.get('year_built', 'Not specified')}
Price: {data.get('price', 'Not specified')}

Key Features:
{data.get('features', 'Not provided')}

Neighborhood Highlights:
{data.get('neighborhood', 'Not provided')}

Tone: {data.get('tone', 'Warm and inviting')}
Target Buyer: {data.get('target_buyer', 'Not specified')}
Additional Notes: {data.get('notes', 'None')}"""
    return system, user


def _re_cma(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate professional CMA narrative sections for listing presentations",
        format_instructions="""Return exactly this structure:
## EXECUTIVE SUMMARY
[2-3 paragraphs, client-facing, non-technical]

## COMPARABLE ANALYSIS
[Discuss each comp, what it tells us about the market]

## PRICING RATIONALE
[Clear explanation of recommended price range]

## MARKET CONDITIONS SUMMARY
[1 paragraph on current market context]"""
    )
    comps_text = "\n".join([
        f"- {c.get('address')}: {c.get('beds')}bd/{c.get('baths')}ba, "
        f"{c.get('sqft')} sqft, sold ${c.get('price')} on {c.get('date')}, "
        f"{c.get('dom')} days on market"
        for c in data.get('comparables', [])
    ])
    user = f"""Generate a CMA narrative for:

Subject Property: {data.get('address')}
Bedrooms: {data.get('bedrooms')} | Bathrooms: {data.get('bathrooms')} | Sqft: {data.get('sqft')}
Year Built: {data.get('year_built', 'Unknown')}
Condition: {data.get('condition', 'Not specified')}

Comparable Sales:
{comps_text or 'No comparables provided'}

Recommended List Price Range: {data.get('price_range', 'Not specified')}
Market Trend Notes: {data.get('market_notes', 'None')}
Seller Situation: {data.get('seller_situation', 'Standard listing')}"""
    return system, user


def _re_email(data: dict, tenant) -> tuple[str, str]:
    email_type = data.get('email_type', 'follow_up')
    type_instructions = {
        'post_showing': 'Post-showing follow-up to a buyer — warm, ask for feedback, keep door open',
        'offer_congrats': 'Congratulations on accepted offer — excited, clear next steps',
        'price_reduction': 'Price reduction announcement to interested buyers — frame positively as opportunity',
        'seller_checkin': 'Monthly check-in with seller during active listing — informative, reassuring',
        'expired_outreach': 'Cold outreach to expired listing owner — empathetic, value-focused, no hard sell',
        'open_house_invite': 'Open house invitation — inviting, highlight key features, clear logistics',
        'buyer_followup': 'General buyer follow-up — nurturing, helpful, check on timeline',
        'referral_request': 'Referral request to past client — grateful, easy ask, no pressure',
    }
    context = type_instructions.get(email_type, 'Professional real estate email')

    system = _base_system(
        tenant,
        role=f"Draft professional real estate emails: {context}",
        format_instructions="""Return exactly:
Subject: [compelling subject line]

[Email body — professional, in the agent's voice, appropriate length for type]

[Sign-off]
[Agent name placeholder: {{AGENT_NAME}}]"""
    )
    user = f"""Email type: {email_type}

Recipient: {data.get('recipient_name', 'Client')}
Property (if relevant): {data.get('property_address', 'N/A')}
Context / key points to include: {data.get('context', 'None provided')}
Tone override: {data.get('tone', 'Default for type')}
Additional details: {data.get('notes', 'None')}"""
    return system, user


def _re_neighborhood(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate branded neighborhood market reports for seller listing appointments",
        format_instructions="""Return exactly:
## NEIGHBORHOOD OVERVIEW
[2 paragraphs: character, lifestyle, what makes it desirable]

## MARKET SNAPSHOT
[Current market conditions, buyer demand, inventory context]

## BUYER PROFILE
[Who is buying in this area and why]

## SCHOOL & COMMUNITY HIGHLIGHTS
[Schools, amenities, proximity to key destinations]

## WHY NOW
[1 paragraph on timing and opportunity for sellers]"""
    )
    user = f"""Generate a neighborhood market report:

Neighborhood/Area: {data.get('neighborhood')}
City/Zip: {data.get('location')}
Property Type Focus: {data.get('property_type', 'Single family residential')}
Price Range in Area: {data.get('price_range', 'Not specified')}
Agent Notes on Area: {data.get('agent_notes', 'None')}"""
    return system, user


def _re_appointment(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate listing appointment presentation outlines and talking points",
        format_instructions="""Return exactly:
## OPENING — BUILD RAPPORT
[Suggested opening, key questions to ask seller]

## MARKET OVERVIEW
[Local market context for this price range]

## PROPERTY POSITIONING
[How to frame this property's strengths and address weaknesses]

## PRICING STRATEGY
[Data-backed price recommendation narrative]

## MARKETING PLAN
[Bullet-point marketing activities with brief descriptions]

## WHY OUR TEAM
[Value proposition talking points — editable for agent]

## TIMELINE & NEXT STEPS
[From listing to closing: what to expect]

## COMMON SELLER OBJECTIONS & RESPONSES
[Top 3-4 objections with suggested responses]"""
    )
    user = f"""Generate a listing appointment presentation for:

Property Address: {data.get('address')}
Bedrooms/Baths/Sqft: {data.get('specs', 'Not specified')}
Estimated Value Range: {data.get('value_range', 'Not specified')}
Seller Situation: {data.get('seller_situation', 'Standard sale')}
Known Challenges: {data.get('challenges', 'None noted')}
Agent Notes: {data.get('notes', 'None')}"""
    return system, user


def _re_competitive(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate competitive analysis briefs comparing a subject property to active competition",
        format_instructions="""Return exactly:
## COMPETITIVE POSITION SUMMARY
[How subject property stacks up overall — 1 paragraph]

## ADVANTAGES OVER COMPETITION
[Bulleted list with brief explanations]

## AREAS WHERE COMPETITION HAS EDGE
[Honest assessment — helps agent prepare]

## BUYER OBJECTION ANTICIPATION
[Likely objections buyers will raise and suggested responses]

## PRICING POSITION
[How pricing compares and what it signals to buyers]

## RECOMMENDED TALKING POINTS
[For agent use in showings and buyer conversations]"""
    )
    comps_text = "\n".join([
        f"- {c.get('address')}: {c.get('beds')}bd/{c.get('baths')}ba, "
        f"{c.get('sqft')} sqft, listed at ${c.get('price')}, {c.get('dom')} days on market. "
        f"Notes: {c.get('notes', 'None')}"
        for c in data.get('competitors', [])
    ])
    user = f"""Generate competitive analysis:

Subject Property: {data.get('address')}
Specs: {data.get('specs')}
List Price: {data.get('list_price')}
Key Features: {data.get('features', 'Not specified')}

Competing Active Listings:
{comps_text or 'No competitors provided'}

Market Context: {data.get('market_notes', 'None')}"""
    return system, user


def _re_timeline(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate a complete transaction update email sequence for buyers or sellers",
        format_instructions="""Generate one email per milestone listed. For each email return:

--- EMAIL [N]: [MILESTONE NAME] ---
Send Date: [relative to contract date]
Subject: [subject line]
[Email body]
---"""
    )
    user = f"""Generate a full transaction update email sequence for a {data.get('transaction_type', 'purchase')}.

Client Type: {data.get('client_type', 'buyer')}
Client Name: {data.get('client_name', 'Client')}
Property Address: {data.get('address')}
Contract Date: {data.get('contract_date')}
Key Dates:
- Inspection Period Ends: {data.get('inspection_end', 'Not set')}
- Appraisal Deadline: {data.get('appraisal_date', 'Not set')}
- Loan Commitment: {data.get('loan_commitment', 'Not set')}
- Final Walkthrough: {data.get('walkthrough_date', 'Not set')}
- Closing Date: {data.get('closing_date')}

Milestones to cover: Contract executed, inspection ordered, inspection complete, 
appraisal ordered, loan approval, clear to close, final walkthrough reminder, closing day."""
    return system, user


def _re_seller_update(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate weekly seller update emails — informative, reassuring, professional",
        format_instructions="""Return exactly:
Subject: [subject line referencing their property or week number]

[Opening — acknowledge the week]

[Showing activity section]

[Buyer feedback summary]

[Market context note if relevant]

[Price/strategy discussion if applicable — be tactful]

[Next steps and what agent is doing]

[Closing — reassuring, accessible]

{{AGENT_NAME}}"""
    )
    user = f"""Generate a weekly seller update email.

Seller Name: {data.get('seller_name')}
Property Address: {data.get('address')}
Days on Market: {data.get('dom')}
Week Number: {data.get('week_number', 'This week')}

Showings This Week: {data.get('showing_count', 0)}
Buyer Feedback Received:
{data.get('feedback', 'No formal feedback received this week')}

Price Discussion Needed: {data.get('price_discussion', 'No')}
Market Notes: {data.get('market_notes', 'Market remains active')}
Agent Action Items This Week: {data.get('agent_actions', 'Continued marketing efforts')}"""
    return system, user


def _re_buyer_consult(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate formal Buyer Needs Analysis documents from consultation notes",
        format_instructions="""Return exactly:
## BUYER PROFILE SUMMARY
[Who they are, brief context]

## SEARCH CRITERIA
[Formatted list of must-haves, want-to-haves, deal-breakers]

## FINANCIAL PARAMETERS
[Budget, pre-approval status, down payment, timeline]

## TARGET AREAS
[Neighborhoods, school districts, commute requirements]

## BUYING MOTIVATION & TIMELINE
[Why they're buying, how urgently, life circumstances]

## NEXT STEPS
[What agent will do, what buyer needs to prepare]

## NOTES FOR AGENT
[Anything to remember about this buyer — private section]"""
    )
    user = f"""Generate a Buyer Needs Analysis from this consultation:

Buyer Name(s): {data.get('buyer_names')}
Consultation Date: {data.get('date', 'Today')}
Pre-Approved: {data.get('pre_approved', 'Unknown')}
Budget Range: {data.get('budget')}
Down Payment: {data.get('down_payment', 'Not discussed')}
Target Areas: {data.get('target_areas')}
Must-Haves: {data.get('must_haves')}
Nice-to-Haves: {data.get('nice_to_haves', 'None specified')}
Deal-Breakers: {data.get('deal_breakers', 'None specified')}
Timeline to Buy: {data.get('timeline')}
Motivation: {data.get('motivation', 'Not specified')}
Current Situation: {data.get('current_situation', 'Not specified')}
Agent Notes: {data.get('agent_notes', 'None')}"""
    return system, user


def _re_offer_letter(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Write compelling personal offer letters from buyers to sellers — warm, genuine, wins multiple offer situations",
        format_instructions="""Write a single personal letter. No headers. 3-5 paragraphs.
Warm and genuine. Mention specific things about the home that resonated.
Connect the buyer's story to the home. Close with appreciation, not desperation.
Do not mention price, terms, or negotiating language — this is personal, not transactional."""
    )
    user = f"""Write a buyer personal letter to the seller.

Buyer Name(s): {data.get('buyer_names')}
Buyer Situation: {data.get('buyer_situation')}
(e.g. young couple, growing family, relocating for work, empty nesters downsizing)

What they loved about the home:
{data.get('home_highlights')}

Their story / why this home:
{data.get('buyer_story')}

Tone: {data.get('tone', 'Warm and sincere')}
Additional personal details to weave in: {data.get('extra_details', 'None')}"""
    return system, user


def _re_expired_outreach(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate a 5-touch expired listing and FSBO outreach email sequence — empathetic, value-focused, no pressure",
        format_instructions="""Generate exactly 5 emails. For each:

--- EMAIL [N] — [SEND TIMING] ---
Subject: [subject line]
[Email body]
---

Timing: Email 1 (Day 1), Email 2 (Day 3), Email 3 (Day 7), Email 4 (Day 14), Email 5 (Day 21 — breakup email)"""
    )
    user = f"""Generate expired/FSBO outreach sequence.

Lead Type: {data.get('lead_type', 'Expired listing')}
Owner Name: {data.get('owner_name', 'Homeowner')}
Property Address: {data.get('address')}
Days Expired / Listed as FSBO: {data.get('days', 'Unknown')}
Original List Price: {data.get('original_price', 'Unknown')}
Known Reason for Expiring (if any): {data.get('reason', 'Unknown')}
Agent Differentiator to Highlight: {data.get('differentiator', 'Local expertise and proven marketing')}"""
    return system, user


def _re_soi_campaign(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate sphere of influence email campaigns — genuine, relationship-focused, not salesy",
        format_instructions="""For each segment provided, generate one email. Format:

--- [SEGMENT NAME] ---
Subject: [subject line]
[Email body — personal, warm, specific to that relationship type]
---"""
    )
    segments_text = "\n".join([
        f"- {s.get('name')}: {s.get('description', '')}"
        for s in data.get('segments', [])
    ])
    user = f"""Generate sphere of influence touchpoint emails.

Segments to cover:
{segments_text or 'Past clients, referral partners, personal network'}

Season/Context: {data.get('context', 'General quarterly touchpoint')}
Value to offer in emails: {data.get('value_offer', 'Market update, local insights')}
Call to action: {data.get('cta', 'Soft — just stay top of mind')}"""
    return system, user


def _re_just_listed(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate complete just listed / just sold announcement content suites",
        format_instructions="""Return exactly:
## INSTAGRAM CAPTION
[Engaging caption, 150-220 chars, 8-10 hashtags]

## FACEBOOK POST
[Longer post, conversational, 3-4 sentences + hashtags]

## LINKEDIN POST
[Professional angle, market insight framing]

## EMAIL BLAST
Subject: [subject line]
[Email body — 3-4 sentences, clear CTA]

## NEIGHBOR POSTCARD COPY
[Short, direct, neighborhood-relevant — 60-80 words]

## TEXT MESSAGE VERSION
[Under 160 characters]"""
    )
    user = f"""Generate announcement suite for:

Type: {data.get('announcement_type', 'Just Listed')}
Address: {data.get('address')}
Price: {data.get('price')}
Key Stats: {data.get('specs', 'Not specified')}
Headline Feature: {data.get('headline_feature', 'Beautiful home')}
Agent Instagram Handle: {data.get('ig_handle', '')}
Open House Info: {data.get('open_house', 'None scheduled')}"""
    return system, user


def _re_open_house_followup(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate personalized open house follow-up emails for each visitor type",
        format_instructions="""For each visitor, generate one personalized follow-up email. Format:

--- VISITOR: [NAME] ---
Subject: [personalized subject line]
[Email body — reference their specific interest or notes]
---"""
    )
    visitors_text = "\n".join([
        f"- {v.get('name')}, {v.get('email', 'no email')}: {v.get('notes', 'No notes')}"
        for v in data.get('visitors', [])
    ])
    user = f"""Generate personalized follow-up emails for open house visitors.

Property: {data.get('address')}
Open House Date: {data.get('date')}

Visitors:
{visitors_text or 'No visitor data provided'}"""
    return system, user


def _re_virtual_staging(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate virtual staging descriptions and room-by-room design narratives for empty properties",
        format_instructions="""For each room provided, generate:
## [ROOM NAME]
Staging Recommendation: [specific furniture, layout, style suggestions]
Buyer Vision Description: [how to describe this room to buyers — evocative, aspirational]
---"""
    )
    rooms_text = "\n".join([
        f"- {r.get('name')}: {r.get('dimensions', 'Unknown size')}, {r.get('notes', 'No notes')}"
        for r in data.get('rooms', [])
    ])
    user = f"""Generate virtual staging descriptions.

Property Style: {data.get('style', 'Contemporary')}
Target Buyer: {data.get('target_buyer', 'Young professional couple')}
Price Point: {data.get('price', 'Not specified')}

Rooms:
{rooms_text}"""
    return system, user


def _re_property_faq(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate comprehensive property FAQ documents for showings and open houses",
        format_instructions="""Generate a complete FAQ document. Format each question:

**Q: [Question]**
A: [Clear, direct answer]

Organize into sections: Property Details, Financials & HOA, Location & Schools, Logistics, Seller Terms"""
    )
    user = f"""Generate a property FAQ document.

Address: {data.get('address')}
Property Details: {data.get('property_details', 'Not specified')}
HOA: {data.get('hoa', 'None')}
HOA Monthly: {data.get('hoa_fee', 'N/A')}
What HOA Covers: {data.get('hoa_covers', 'N/A')}
School District: {data.get('schools', 'Not specified')}
Flood Zone: {data.get('flood_zone', 'Unknown')}
Utilities (avg monthly): {data.get('utilities', 'Not specified')}
Recent Updates: {data.get('updates', 'None specified')}
Seller's Preferred Closing Timeline: {data.get('closing_pref', 'Flexible')}
Inclusions: {data.get('inclusions', 'Standard')}
Exclusions: {data.get('exclusions', 'None')}
Showing Instructions: {data.get('showing_instructions', 'Contact agent')}
Additional Notes: {data.get('notes', 'None')}"""
    return system, user


def _re_price_reduction(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate professional price reduction recommendation memos for seller clients — analytical, empathetic, persuasive without pressure",
        format_instructions="""Return exactly:
## MARKET CONTEXT
[What the data is showing — objective, factual tone]

## WHAT THE SHOWING ACTIVITY IS TELLING US
[Interpret showing count and feedback objectively]

## THE OPPORTUNITY A PRICE ADJUSTMENT CREATES
[Frame the reduction as strategy, not failure]

## RECOMMENDED ADJUSTMENT
[Specific recommendation with rationale]

## WHAT HAPPENS IF WE STAY AT CURRENT PRICE
[Honest projection — days on market, buyer perception]

## OUR RECOMMENDED NEXT STEPS
[Clear action items]"""
    )
    user = f"""Generate a price reduction recommendation memo for seller.

Seller Name: {data.get('seller_name')}
Property Address: {data.get('address')}
Current List Price: {data.get('current_price')}
Days on Market: {data.get('dom')}
Showings to Date: {data.get('showings')}
Offers Received: {data.get('offers', 'None')}
Buyer Feedback Themes: {data.get('feedback', 'Not specified')}
Recommended New Price: {data.get('recommended_price', 'TBD')}
Competing Listings: {data.get('competition', 'Not specified')}
Market Trend: {data.get('market_trend', 'Stable')}"""
    return system, user


def _re_business_plan(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate professional real estate agent annual business plans and performance reviews",
        format_instructions="""Return exactly:
## YEAR IN REVIEW
[Performance narrative based on numbers provided]

## KEY WINS
[What went well — data-backed]

## LESSONS LEARNED
[What to adjust — constructive framing]

## GOALS FOR NEXT YEAR
[Specific, measurable targets]

## LEAD GENERATION STRATEGY
[How to hit those numbers — by source]

## FINANCIAL PLAN
[GCI target, expenses, net income projection]

## QUARTERLY ACTION PLAN
[Q1, Q2, Q3, Q4 focus areas]

## ACCOUNTABILITY STRUCTURE
[How to track progress]"""
    )
    user = f"""Generate annual business plan.

Agent Name: {data.get('agent_name')}
Years in Business: {data.get('years', 'Not specified')}
Last Year Closings: {data.get('last_closings', 'Not specified')}
Last Year GCI: {data.get('last_gci', 'Not specified')}
Top Lead Sources: {data.get('lead_sources', 'Not specified')}
Goal Closings Next Year: {data.get('goal_closings')}
Goal GCI Next Year: {data.get('goal_gci')}
Avg Commission: {data.get('avg_commission', 'Not specified')}
Team Size: {data.get('team_size', 'Solo')}
Biggest Challenge Last Year: {data.get('challenge', 'Not specified')}
Focus Area for Growth: {data.get('focus', 'Not specified')}"""
    return system, user


def _re_bio(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Write compelling, personality-driven real estate agent bios — not generic, not boring",
        format_instructions="""Return exactly:
## WEBSITE BIO (LONG)
[300-400 words. Story-driven. Third person. Includes credentials but leads with personality and local expertise.]

## ZILLOW / REALTOR.COM BIO (SHORT)
[150-200 words. Third person. Punchy, leads with value prop.]

## SOCIAL MEDIA BIO
[Under 150 characters. First person. Includes specialty and location.]"""
    )
    user = f"""Write agent bios for:

Agent Name: {data.get('agent_name')}
Years in Real Estate: {data.get('years')}
Specialty / Niche: {data.get('specialty', 'Residential')}
Location / Market: {data.get('market')}
License / Designations: {data.get('designations', 'Licensed REALTOR®')}
Brokerage: {data.get('brokerage', '')}
Personal Background: {data.get('background', 'Not provided')}
Why They Got Into Real Estate: {data.get('why', 'Not provided')}
Unique Differentiators: {data.get('differentiators', 'Not provided')}
Personal Interests (to humanize): {data.get('interests', 'Not provided')}
Tone: {data.get('tone', 'Professional but approachable')}"""
    return system, user


def _re_testimonial(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Polish client testimonials — clean grammar and structure while preserving the client's authentic voice",
        format_instructions="""Return exactly:
## POLISHED TESTIMONIAL
[The cleaned-up version — same voice, better structure, no grammar issues]

## SHORT PULL QUOTE
[1-2 sentences extracted for social media / website highlight use]

## SUGGESTED USE CASES
[Where this testimonial works best: website, Zillow, postcards, etc.]"""
    )
    user = f"""Polish this client testimonial.

Raw Testimonial:
{data.get('raw_testimonial')}

Client Name: {data.get('client_name', 'Client')}
Transaction Type: {data.get('transaction_type', 'Home purchase')}
Key Theme to Preserve: {data.get('theme', 'Preserve whatever made it special')}"""
    return system, user


def _re_referral(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate personalized referral thank-you letters — genuine, specific, not transactional",
        format_instructions="""Return exactly:
## EMAIL VERSION
Subject: [subject line]
[Thank you email — warm, specific, mentions the referral and outcome if known]

## PHYSICAL LETTER VERSION
[More formal, print-ready version for a handwritten card or letter]

## GIFT SUGGESTION
[Based on relationship type — thoughtful, specific, $25-$100 range]"""
    )
    user = f"""Generate referral thank-you content.

Referral Source Name: {data.get('source_name')}
Relationship to Agent: {data.get('relationship', 'Past client')}
Who They Referred: {data.get('referral_name', 'A client')}
Outcome: {data.get('outcome', 'Transaction in progress')}
Anything Special About This Person: {data.get('notes', 'None')}"""
    return system, user


# ─────────────────────────────────────────
# CONTRACT PROMPT BUILDERS
# ─────────────────────────────────────────

def _contract_listing_agreement(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate Florida-compliant exclusive right of sale listing agreement text sections",
        format_instructions="""Generate the narrative and fillable sections for each contract section below.
Use [BLANK] for any field that should become a fillable PDF field.
Use {{AGENT_NAME}}, {{BROKERAGE_NAME}}, {{LICENSE_NUMBER}} as agent placeholders.

Sections to generate:
1. PROPERTY DESCRIPTION
2. LISTING PERIOD (dates, auto-extension clause)
3. LISTING PRICE
4. COMMISSION TERMS
5. AGENT DUTIES AND MARKETING PLAN
6. SELLER REPRESENTATIONS
7. LOCKBOX AND SHOWING AUTHORIZATION
8. MLS AUTHORIZATION
9. DISPUTE RESOLUTION
10. GENERAL TERMS"""
    )
    user = f"""Generate listing agreement sections for:

Property Address: {data.get('address')}
Seller Name(s): {data.get('seller_names')}
Listing Start Date: {data.get('start_date', '[BLANK]')}
Listing End Date: {data.get('end_date', '[BLANK]')}
Listing Price: {data.get('list_price', '[BLANK]')}
Commission Rate: {data.get('commission', '[BLANK]')}%
Buyer Agent Commission: {data.get('buyer_commission', '[BLANK]')}%
Lockbox: {data.get('lockbox', 'Yes')}
MLS Authorization: {data.get('mls_auth', 'Yes')}
Special Terms: {data.get('special_terms', 'None')}"""
    return system, user


def _contract_buyer_broker(data: dict, tenant) -> tuple[str, str]:
    system = _base_system(
        tenant,
        role="Generate Florida buyer broker agreement text sections",
        format_instructions="""Generate narrative and fillable sections. Use [BLANK] for fillable fields.

Sections:
1. BUYER IDENTIFICATION
2. AGREEMENT PERIOD
3. GEOGRAPHIC SCOPE
4. AGENT DUTIES TO BUYER
5. BUYER OBLIGATIONS
6. COMPENSATION TERMS
7. DISCLOSED DUAL AGENCY (if applicable)
8. DISPUTE RESOLUTION
9. GENERAL TERMS"""
    )
    user = f"""Generate buyer broker agreement for:

Buyer Name(s): {data.get('buyer_names')}
Agreement Start: {data.get('start_date', '[BLANK]')}
Agreement End: {data.get('end_date', '[BLANK]')}
Geographic Area: {data.get('area', '[BLANK]')}
Property Type: {data.get('property_type', 'Residential')}
Price Range: {data.get('price_range', '[BLANK]')}
Compensation: {data.get('compensation', '[BLANK]')}
Dual Agency Permitted: {data.get('dual_agency', 'No')}"""
    return system, user


# ─────────────────────────────────────────
# REGISTRY
# ─────────────────────────────────────────

PROMPT_REGISTRY = {
    # Generation modules
    "re_listing":           _re_listing,
    "re_cma":               _re_cma,
    "re_email":             _re_email,
    "re_neighborhood":      _re_neighborhood,
    "re_appointment":       _re_appointment,
    "re_competitive":       _re_competitive,
    "re_timeline":          _re_timeline,
    "re_seller_update":     _re_seller_update,
    "re_buyer_consult":     _re_buyer_consult,
    "re_offer_letter":      _re_offer_letter,
    "re_expired_outreach":  _re_expired_outreach,
    "re_soi_campaign":      _re_soi_campaign,
    "re_just_listed":       _re_just_listed,
    "re_open_house_followup": _re_open_house_followup,
    "re_virtual_staging":   _re_virtual_staging,
    "re_property_faq":      _re_property_faq,
    "re_price_reduction":   _re_price_reduction,
    "re_business_plan":     _re_business_plan,
    "re_bio":               _re_bio,
    "re_testimonial":       _re_testimonial,
    "re_referral":          _re_referral,
    # Contract modules
    "contract_listing_agreement": _contract_listing_agreement,
    "contract_buyer_broker":      _contract_buyer_broker,
}
```

---

## 6. PDF Generation System

### `api/services/pdf_service.py`

```python
"""
PDF generation using ReportLab.
Generates fillable PDFs with signature blocks, brokerage header, and structured sections.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
import os
import uuid
from datetime import datetime
from config import settings


BRAND_BLUE = colors.HexColor('#2563eb')
LIGHT_GRAY = colors.HexColor('#f3f4f6')
MID_GRAY = colors.HexColor('#9ca3af')
DARK = colors.HexColor('#111827')


def generate_document_pdf(
    title: str,
    content_sections: dict,
    tenant,
    output_filename: str = None
) -> str:
    """
    Generate a branded PDF for any generated document.
    Returns the file path.
    """
    if not output_filename:
        output_filename = f"{uuid.uuid4()}.pdf"

    output_path = os.path.join(settings.pdf_output_dir, output_filename)
    os.makedirs(settings.pdf_output_dir, exist_ok=True)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1.2 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = _get_styles(tenant)
    story = []

    # Title
    story.append(Paragraph(title, styles['doc_title']))
    story.append(Spacer(1, 0.1 * inch))
    story.append(HRFlowable(width="100%", thickness=2, color=BRAND_BLUE))
    story.append(Spacer(1, 0.2 * inch))

    # Generated date
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y')}",
        styles['meta']
    ))
    story.append(Spacer(1, 0.3 * inch))

    # Content sections
    for section_title, section_body in content_sections.items():
        if section_title and section_body:
            story.append(Paragraph(section_title, styles['section_header']))
            story.append(Spacer(1, 0.08 * inch))
            # Handle multi-paragraph sections
            for para in section_body.split('\n\n'):
                if para.strip():
                    story.append(Paragraph(para.strip(), styles['body']))
                    story.append(Spacer(1, 0.08 * inch))
            story.append(Spacer(1, 0.15 * inch))

    def add_header_footer(canvas_obj, doc_obj):
        _draw_header(canvas_obj, doc_obj, tenant)
        _draw_footer(canvas_obj, doc_obj, tenant)

    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    return output_path


def generate_contract_pdf(
    contract_type: str,
    contract_data: dict,
    generated_sections: dict,
    tenant,
    output_filename: str = None
) -> str:
    """
    Generate a contract PDF with fillable signature blocks.
    """
    if not output_filename:
        output_filename = f"contract_{uuid.uuid4()}.pdf"

    output_path = os.path.join(settings.pdf_output_dir, output_filename)
    os.makedirs(settings.pdf_output_dir, exist_ok=True)

    CONTRACT_TITLES = {
        'listing_agreement': 'Exclusive Right of Sale Listing Agreement',
        'buyer_broker': 'Buyer Broker Agreement',
        'offer_to_purchase': 'Offer to Purchase — Residential',
        'seller_disclosure': 'Seller Property Disclosure',
        'lease_agreement': 'Residential Lease Agreement',
        'commission_agreement': 'Commission Agreement',
        'as_is_cover_sheet': 'As-Is Residential Contract Cover Sheet',
    }
    title = CONTRACT_TITLES.get(contract_type, 'Contract')

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1.4 * inch,
        bottomMargin=1 * inch,
    )

    styles = _get_styles(tenant)
    story = []

    # Contract title
    story.append(Paragraph(title.upper(), styles['contract_title']))
    story.append(Spacer(1, 0.05 * inch))
    story.append(HRFlowable(width="100%", thickness=3, color=BRAND_BLUE))
    story.append(Spacer(1, 0.15 * inch))

    # Parties block
    story.append(_parties_block(contract_data, tenant, styles))
    story.append(Spacer(1, 0.2 * inch))

    # Content sections from Claude output
    for section_title, section_body in generated_sections.items():
        if section_body and section_body.strip():
            story.append(Paragraph(section_title, styles['section_header']))
            story.append(Spacer(1, 0.06 * inch))
            for para in section_body.split('\n\n'):
                if para.strip():
                    story.append(Paragraph(para.strip(), styles['body']))
                    story.append(Spacer(1, 0.06 * inch))
            story.append(Spacer(1, 0.1 * inch))

    # Signature page
    story.append(PageBreak())
    story.append(_signature_page(contract_data, contract_type, tenant, styles))

    def add_header_footer(canvas_obj, doc_obj):
        _draw_header(canvas_obj, doc_obj, tenant)
        _draw_footer(canvas_obj, doc_obj, tenant)

    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    return output_path


def _parties_block(contract_data: dict, tenant, styles) -> Table:
    agent_name = contract_data.get('agent_name', '{{AGENT_NAME}}')
    brokerage = tenant.brokerage_name or tenant.company_name or '{{BROKERAGE}}'
    license_num = tenant.license_number or '{{LICENSE_NUMBER}}'

    data = [
        ['BROKERAGE / AGENT', 'CLIENT(S)'],
        [
            f"{brokerage}\n{agent_name}\nLicense: {license_num}\n{tenant.phone or ''}",
            f"{contract_data.get('client_names', '_______________________')}\n"
            f"{contract_data.get('client_address', '_______________________')}\n"
            f"{contract_data.get('client_phone', '_______________________')}"
        ]
    ]
    table = Table(data, colWidths=[3.5 * inch, 3.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, 1), 9),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, MID_GRAY),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica'),
    ]))
    return table


def _signature_page(contract_data: dict, contract_type: str, tenant, styles) -> Table:
    """Build the signature block table."""
    sig_line = '_' * 45
    date_line = '_' * 20

    # Determine parties based on contract type
    if contract_type in ('listing_agreement',):
        parties = [
            ('SELLER', contract_data.get('seller_names', '').split(',')[0].strip()),
            ('SELLER', contract_data.get('seller_names', '').split(',')[-1].strip()
             if ',' in contract_data.get('seller_names', '') else ''),
            ('LISTING AGENT', contract_data.get('agent_name', '{{AGENT_NAME}}')),
            ('BROKER', tenant.brokerage_name or '{{BROKERAGE}}'),
        ]
    elif contract_type == 'buyer_broker':
        parties = [
            ('BUYER', contract_data.get('buyer_names', '').split(',')[0].strip()),
            ('BUYER', contract_data.get('buyer_names', '').split(',')[-1].strip()
             if ',' in contract_data.get('buyer_names', '') else ''),
            ('BUYER\'S AGENT', contract_data.get('agent_name', '{{AGENT_NAME}}')),
        ]
    else:
        parties = [
            ('PARTY 1', ''),
            ('PARTY 2', ''),
            ('AGENT', contract_data.get('agent_name', '{{AGENT_NAME}}')),
        ]

    sig_data = [['SIGNATURES', '', '', '']]
    sig_data.append(['ROLE', 'PRINTED NAME', 'SIGNATURE', 'DATE'])

    for role, name in parties:
        if name or role:
            sig_data.append([
                role,
                name or sig_line,
                sig_line,
                date_line
            ])

    table = Table(sig_data, colWidths=[1.2*inch, 2*inch, 2.3*inch, 1.5*inch])
    table.setStyle(TableStyle([
        ('SPAN', (0, 0), (-1, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, MID_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 2), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    return table


def _get_styles(tenant) -> dict:
    brand_color = colors.HexColor(tenant.brand_color or '#2563eb')
    styles = getSampleStyleSheet()

    return {
        'doc_title': ParagraphStyle('DocTitle', fontSize=18, textColor=DARK,
                                     fontName='Helvetica-Bold', spaceAfter=4),
        'contract_title': ParagraphStyle('ContractTitle', fontSize=16, textColor=DARK,
                                          fontName='Helvetica-Bold', alignment=1, spaceAfter=4),
        'section_header': ParagraphStyle('SectionHeader', fontSize=11, textColor=brand_color,
                                          fontName='Helvetica-Bold', spaceBefore=6, spaceAfter=2),
        'body': ParagraphStyle('Body', fontSize=9.5, textColor=DARK,
                                fontName='Helvetica', leading=14),
        'meta': ParagraphStyle('Meta', fontSize=8, textColor=MID_GRAY,
                                fontName='Helvetica'),
        'sig_label': ParagraphStyle('SigLabel', fontSize=8, textColor=MID_GRAY,
                                     fontName='Helvetica-Bold'),
    }


def _draw_header(c: canvas.Canvas, doc, tenant):
    c.saveState()
    page_width = letter[0]
    header_y = letter[1] - 0.6 * inch

    # Brand color bar
    c.setFillColor(colors.HexColor(tenant.brand_color or '#2563eb'))
    c.rect(0, letter[1] - 0.35 * inch, page_width, 0.35 * inch, fill=1, stroke=0)

    # Company name in header bar
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 10)
    company = tenant.company_name or tenant.name
    c.drawString(0.75 * inch, letter[1] - 0.23 * inch, company)

    # License in header bar
    if tenant.license_number:
        c.setFont('Helvetica', 8)
        c.drawRightString(page_width - 0.75 * inch, letter[1] - 0.23 * inch,
                          f"Lic. {tenant.license_number}")

    c.restoreState()


def _draw_footer(c: canvas.Canvas, doc, tenant):
    c.saveState()
    page_width = letter[0]
    footer_y = 0.45 * inch

    c.setStrokeColor(MID_GRAY)
    c.setLineWidth(0.5)
    c.line(0.75 * inch, footer_y + 0.15 * inch, page_width - 0.75 * inch, footer_y + 0.15 * inch)

    c.setFont('Helvetica', 7.5)
    c.setFillColor(MID_GRAY)

    company = tenant.company_name or tenant.name
    footer_left = company
    if tenant.phone:
        footer_left += f"  ·  {tenant.phone}"
    if tenant.website:
        footer_left += f"  ·  {tenant.website}"

    c.drawString(0.75 * inch, footer_y, footer_left)
    c.drawRightString(page_width - 0.75 * inch, footer_y,
                      f"Page {doc.page}  ·  Generated {datetime.now().strftime('%m/%d/%Y')}")
    c.restoreState()
```

---

## 7. Module Definitions — All Features

### Complete Module Reference

| Module Key | Page | Description | Input Fields |
|---|---|---|---|
| `re_listing` | ListingGenerator | Listing descriptions (3 formats + social) | address, beds, baths, sqft, features, tone, target_buyer |
| `re_cma` | CMAGenerator | CMA narrative sections | subject property, 3-5 comps, price range |
| `re_email` | EmailDrafter | Email drafter (9 types) | email_type, recipient, context, property |
| `re_neighborhood` | NeighborhoodReport | Neighborhood market report PDF | neighborhood, location, price range |
| `re_appointment` | ListingAppointment | Listing appointment deck + objections | address, specs, seller situation, challenges |
| `re_competitive` | CompetitiveAnalysis | Competitive brief vs active listings | subject property, competitor listings |
| `re_timeline` | TransactionTimeline | Full transaction email sequence | client info, all key dates |
| `re_seller_update` | SellerUpdate | Weekly seller update email | address, DOM, showings, feedback |
| `re_buyer_consult` | BuyerConsultation | Buyer needs analysis PDF | buyer details, criteria, timeline |
| `re_offer_letter` | OfferLetter | Personal buyer-to-seller letter | buyer story, home highlights |
| `re_expired_outreach` | ExpiredFSBO | 5-touch outreach sequence | owner name, address, lead type |
| `re_soi_campaign` | SphereOfInfluence | SOI touchpoint email batch | segments, context, CTA |
| `re_just_listed` | JustListedSold | Full announcement suite (6 formats) | address, price, specs, type |
| `re_open_house_followup` | OpenHouseFollowUp | Personalized follow-up per visitor | visitors list with notes |
| `re_virtual_staging` | VirtualStaging | Room-by-room staging narrative | rooms list, style, target buyer |
| `re_property_faq` | PropertyFAQ | Property FAQ document | full property details |
| `re_price_reduction` | PriceReduction | Price reduction memo for seller | DOM, showings, feedback, rec price |
| `re_business_plan` | BusinessPlan | Annual business plan + review | prior year numbers, goals |
| `re_bio` | BioWriter | Agent bio in 3 formats | background, specialty, differentiators |
| `re_testimonial` | TestimonialSystem | Polish raw testimonial + pull quote | raw text, client name |
| `re_referral` | ReferralThankYou | Referral thank-you (email + letter + gift) | source name, relationship, outcome |
| `contract_listing_agreement` | ContractBuilder | Listing agreement PDF with sig blocks | seller, property, commission, dates |
| `contract_buyer_broker` | ContractBuilder | Buyer broker agreement PDF | buyer, area, terms |

---

## 8. React Frontend

### `web/src/components/shared/GeneratorForm.jsx`

```jsx
/**
 * Universal generator form component.
 * Pass in field config, it renders the form, calls the API, shows output.
 *
 * Props:
 *   module: string
 *   moduleLabel: string
 *   fields: FieldConfig[]
 *   onSuccess?: (doc) => void
 */

import { useState } from "react"
import { useGenerate } from "../../hooks/useGenerate"
import OutputCard from "./OutputCard"
import Button from "../ui/Button"
import FieldBuilder from "./FieldBuilder"

export default function GeneratorForm({ module, moduleLabel, fields, onSuccess }) {
  const [formData, setFormData] = useState({})
  const { generate, loading, result, error, reset } = useGenerate()

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    const doc = await generate(module, formData)
    if (doc && onSuccess) onSuccess(doc)
  }

  if (result) {
    return (
      <OutputCard
        document={result}
        moduleLabel={moduleLabel}
        onRegenerate={reset}
      />
    )
  }

  return (
    <div className="generator-form">
      <div className="form-fields">
        {fields.map(field => (
          <FieldBuilder
            key={field.key}
            field={field}
            value={formData[field.key] || ""}
            onChange={(val) => handleChange(field.key, val)}
          />
        ))}
      </div>
      {error && <div className="error-message">{error}</div>}
      <Button
        onClick={handleSubmit}
        loading={loading}
        disabled={loading}
        variant="primary"
        size="lg"
      >
        {loading ? "Generating..." : `Generate ${moduleLabel}`}
      </Button>
    </div>
  )
}
```

### `web/src/hooks/useGenerate.js`

```js
import { useState } from "react"
import api from "../api/client"

export function useGenerate() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const generate = async (module, inputData) => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = module.startsWith("contract_")
        ? `/contracts`
        : `/generate/${module.replace("_", "/").replace("re/", "re/")}`
      const { data } = await api.post(endpoint, { module, input_data: inputData })
      setResult(data)
      return data
    } catch (err) {
      setError(err.response?.data?.detail || "Generation failed. Please try again.")
      return null
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return { generate, loading, result, error, reset }
}
```

### Field Config Pattern

Define each page's fields as a config array — no repeated form code:

```js
// pages/listings/ListingGenerator.jsx
const LISTING_FIELDS = [
  { key: "address",      label: "Property Address",    type: "text",     required: true },
  { key: "bedrooms",     label: "Bedrooms",            type: "number",   required: true },
  { key: "bathrooms",    label: "Bathrooms",           type: "number",   required: true },
  { key: "sqft",         label: "Square Footage",      type: "number",   required: true },
  { key: "price",        label: "List Price",          type: "text" },
  { key: "year_built",   label: "Year Built",          type: "number" },
  { key: "lot_size",     label: "Lot Size",            type: "text" },
  { key: "features",     label: "Key Features",        type: "textarea", rows: 4,
    placeholder: "List standout features, upgrades, finishes..." },
  { key: "neighborhood", label: "Neighborhood Highlights", type: "textarea", rows: 3 },
  { key: "target_buyer", label: "Target Buyer",        type: "text",
    placeholder: "Young family, investor, retiree..." },
  { key: "tone",         label: "Tone",                type: "select",
    options: ["Warm and inviting", "Luxury", "Investment", "Starter Home", "Family-focused"] },
  { key: "notes",        label: "Additional Notes",    type: "textarea", rows: 2 },
]
```

### Sidebar Navigation Structure

```js
const NAV = [
  {
    group: "Listings",
    items: [
      { label: "Listing Generator",     path: "/listings",           icon: "Home" },
      { label: "Property FAQ",          path: "/listings/faq",       icon: "HelpCircle" },
      { label: "Virtual Staging",       path: "/listings/staging",   icon: "Eye" },
    ]
  },
  {
    group: "Market Intelligence",
    items: [
      { label: "Neighborhood Report",   path: "/market/neighborhood", icon: "Map" },
      { label: "Listing Appointment",   path: "/market/appointment",  icon: "Presentation" },
      { label: "Competitive Analysis",  path: "/market/competitive",  icon: "BarChart2" },
      { label: "Price Reduction Memo",  path: "/market/price",        icon: "TrendingDown" },
    ]
  },
  {
    group: "Client Communication",
    items: [
      { label: "Email Drafter",         path: "/clients/email",       icon: "Mail" },
      { label: "Transaction Timeline",  path: "/clients/timeline",    icon: "Calendar" },
      { label: "Seller Update",         path: "/clients/seller",      icon: "RefreshCw" },
      { label: "Buyer Consultation",    path: "/clients/buyer",       icon: "Users" },
      { label: "Offer Letter",          path: "/clients/offer",       icon: "Heart" },
      { label: "CMA Narrative",         path: "/clients/cma",         icon: "FileText" },
    ]
  },
  {
    group: "Lead Generation",
    items: [
      { label: "Expired / FSBO",        path: "/leads/expired",       icon: "Target" },
      { label: "Sphere of Influence",   path: "/leads/soi",           icon: "Network" },
      { label: "Just Listed / Sold",    path: "/leads/announcements", icon: "Megaphone" },
      { label: "Open House Follow-Up",  path: "/leads/open-house",    icon: "Door" },
    ]
  },
  {
    group: "Contracts",
    items: [
      { label: "Contract Builder",      path: "/contracts",           icon: "FilePen" },
      { label: "Contract History",      path: "/contracts/list",      icon: "Archive" },
    ]
  },
  {
    group: "Agent Tools",
    items: [
      { label: "Business Plan",         path: "/agent/business-plan", icon: "TrendingUp" },
      { label: "Agent Bio Writer",      path: "/agent/bio",           icon: "UserCircle" },
      { label: "Testimonial Polish",    path: "/agent/testimonials",  icon: "Star" },
      { label: "Referral Thank-You",    path: "/agent/referral",      icon: "Gift" },
    ]
  },
  {
    group: "Chatbots",
    items: [
      { label: "Bot Manager",           path: "/bots",                icon: "Bot" },
    ]
  },
  {
    group: "History & Usage",
    items: [
      { label: "Document History",      path: "/documents",           icon: "Clock" },
      { label: "Usage Dashboard",       path: "/usage",               icon: "Activity" },
    ]
  },
]
```

---

## 9. Railway Deployment

### `railway.toml`

```toml
[build]
  builder = "NIXPACKS"

[[services]]
  name = "api"
  source = "api/"

  [services.deploy]
    startCommand = "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT"
    healthcheckPath = "/health"
    restartPolicyType = "ON_FAILURE"

  [services.variables]
    ENVIRONMENT = "production"
    DATABASE_URL = "${{Postgres.DATABASE_URL}}"
    ANTHROPIC_API_KEY = "${{ANTHROPIC_API_KEY}}"
    SECRET_KEY = "${{SECRET_KEY}}"
    ALLOWED_ORIGINS = "${{ALLOWED_ORIGINS}}"
    PDF_OUTPUT_DIR = "/data/pdfs"
    UPLOAD_DIR = "/data/uploads"

  [services.volume]
    mountPath = "/data"
    size = 5

[[services]]
  name = "web"
  source = "web/"

  [services.build]
    buildCommand = "npm ci && npm run build"
    outputDirectory = "dist"

  [services.variables]
    VITE_API_URL = "${{api.RAILWAY_PUBLIC_DOMAIN}}"
```

### `api/requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
alembic==1.13.3
asyncpg==0.29.0
pydantic==2.9.2
pydantic-settings==2.5.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
anthropic==0.40.0
reportlab==4.2.5
pypdf==5.1.0
pillow==10.4.0
httpx==0.27.2
python-dotenv==1.0.1
```

### `web/package.json` (key deps)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "axios": "^1.7.7",
    "lucide-react": "^0.447.0",
    "react-markdown": "^9.0.1",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.2",
    "vite": "^5.4.8",
    "tailwindcss": "^3.4.13",
    "autoprefixer": "^10.4.20"
  }
}
```

---

## 10. Build Order

Follow this exactly. Each phase produces something demoable.

### Phase 1 — Foundation (Days 1–4)

- [ ] Monorepo scaffold: `api/` and `web/` directories
- [ ] FastAPI app with CORS, health endpoint
- [ ] Alembic setup, initial migration with full schema above
- [ ] Auth: JWT login, `/auth/login`, `/auth/me`, protected route middleware
- [ ] Tenant middleware: extract tenant from JWT, attach to request state
- [ ] React app: Vite + React Router + Tailwind setup
- [ ] Login page, AuthContext, protected route wrapper
- [ ] Sidebar layout with nav groups
- [ ] API client (`axios` instance with auth headers)
- [ ] Railway project created, env vars set, first deploy

### Phase 2 — First Generator + Output (Days 5–7)

- [ ] `claude_service.py` and `prompt_builder.py` wired up
- [ ] `usage_tracker.py` writing to `usage_events`
- [ ] `POST /generate/re/listing` endpoint
- [ ] `GeneratorForm`, `FieldBuilder`, `OutputCard` components
- [ ] `ListingGenerator.jsx` page using those components
- [ ] Save output to `generated_documents` on generation
- [ ] Copy to clipboard button on output
- [ ] **DEMO CHECKPOINT:** Generate a listing description end-to-end

### Phase 3 — Core Generation Modules (Days 8–14)

- [ ] `re_email` (all 9 types via dropdown)
- [ ] `re_seller_update`
- [ ] `re_buyer_consult`
- [ ] `re_offer_letter`
- [ ] `re_neighborhood`
- [ ] `re_appointment`
- [ ] `re_timeline`
- [ ] `re_cma`
- [ ] Document history page (`GET /documents`, list + view)
- [ ] Regenerate button (same inputs, new output)
- [ ] Favorite toggle

### Phase 4 — Contract PDF System (Days 15–20)

- [ ] `pdf_service.py` and `contract_pdf.py` built and tested locally
- [ ] `POST /contracts` — generate contract text via Claude + render PDF
- [ ] `GET /contracts/{id}/pdf` — serve PDF file
- [ ] `ContractBuilder.jsx` — form for listing agreement first
- [ ] PDF preview in browser (`<iframe>` or open in new tab)
- [ ] Download button
- [ ] Contract list + status page
- [ ] Buyer broker agreement second
- [ ] **DEMO CHECKPOINT:** Generate a listing agreement, download branded PDF with sig blocks

### Phase 5 — Lead & Outreach Modules (Days 21–26)

- [ ] `re_expired_outreach` (5-email sequence)
- [ ] `re_soi_campaign`
- [ ] `re_just_listed`
- [ ] `re_open_house_followup` + CSV import for visitors
- [ ] Leads table and `GET /leads` page
- [ ] Lead status management (new → contacted → qualified)

### Phase 6 — Chatbot System (Days 27–33)

- [ ] `bot_configs` setup, `POST /bots`, `GET /bots`
- [ ] `BotManager.jsx` — create bot, fill property/business context
- [ ] Public chat endpoints (`/chat/session`, `/chat/message`)
- [ ] `ChatWidget.jsx` — embeddable chat UI
- [ ] Embed code generator (iframe snippet + JS snippet)
- [ ] Lead capture flow inside chat
- [ ] Chat session history in admin
- [ ] **DEMO CHECKPOINT:** Embedded chatbot live on a test page, capturing leads

### Phase 7 — Remaining Modules (Days 34–40)

- [ ] `re_competitive`
- [ ] `re_price_reduction`
- [ ] `re_virtual_staging`
- [ ] `re_property_faq` + PDF export
- [ ] `re_business_plan`
- [ ] `re_bio`
- [ ] `re_testimonial`
- [ ] `re_referral`

### Phase 8 — Polish & Multi-Tenant (Days 41–50)

- [ ] Tenant branding (logo, color) applied in header + PDFs
- [ ] Usage dashboard with token charts
- [ ] Monthly token limit enforcement + warning banner
- [ ] Onboarding wizard (first login: upload brand voice, set company info)
- [ ] Super admin panel (your view of all tenants)
- [ ] Knowledge base upload + internal bot
- [ ] Custom domain support (Railway CNAME)
- [ ] End-to-end test all modules
- [ ] Production hardening: rate limiting, error logging, input validation

---

## Notes for Claude Code

- **Use async SQLAlchemy** throughout — `AsyncSession` with `asyncpg` driver
- **Every DB query must be scoped by `tenant_id`** — never return cross-tenant data
- **Parse Claude output sections** by splitting on `## ` headers — store in `output_sections JSONB`
- **PDF files** go to `/data/pdfs/{uuid}.pdf` — serve via `/files/{filename}` static mount
- **All endpoints return camelCase** from FastAPI using `model_config = ConfigDict(populate_by_name=True)`
- **Token tracking** happens inside `claude_service.py` — not in routers
- **Use `react-markdown`** to render Claude output — it will contain markdown formatting
- **The `GeneratorForm` + `FieldBuilder` + `OutputCard` pattern** handles all 21 modules — build these three components correctly once and the rest is field config

---

*Stack: React 18 + Vite · FastAPI · PostgreSQL · Railway · Anthropic Claude API · ReportLab · pypdf*  
*Target: Multi-tenant real estate AI automation SaaS*