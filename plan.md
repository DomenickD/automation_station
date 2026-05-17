# Claude Automation Platform — Planning Doc
**Verticals: Real Estate & Construction/Contracting**
**Stack: React · FastAPI · PostgreSQL · Railway**

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Vertical 1 — Real Estate](#2-vertical-1--real-estate)
3. [Vertical 2 — Construction / Contracting](#3-vertical-2--constructioncontracting)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [API Design (FastAPI)](#6-api-design-fastapi)
7. [Frontend Design (React)](#7-frontend-design-react)
8. [Prompt Engineering Strategy](#8-prompt-engineering-strategy)
9. [Railway Deployment](#9-railway-deployment)
10. [Multi-Tenant Client Model](#10-multi-tenant-client-model)
11. [Build Order & Milestones](#11-build-order--milestones)
12. [Pricing & Packaging Per Client](#12-pricing--packaging-per-client)

---

## 1. Product Overview

This platform is a **white-labeled, multi-tenant AI automation SaaS** delivered to small businesses in two verticals. Each client gets their own branded instance with tools specific to their workflow. You (the freelancer) manage one codebase with tenant-scoped configuration.

### Core Concept

- One FastAPI backend, multi-tenant via `tenant_id` on every resource
- One React frontend, white-labeled per client via config/theme injection
- PostgreSQL for tenant data, audit logs, generated outputs, and usage tracking
- Claude API as the AI engine, with per-tenant system prompt customization
- Railway for hosting: one backend service, one frontend static deploy, one Postgres instance

### What Clients Get

| Feature | Real Estate | Contracting |
|---|---|---|
| AI document generator | ✅ Listings, CMAs | ✅ Proposals, SOWs |
| Lead follow-up drafting | ✅ Buyer/seller emails | ✅ Quote follow-up |
| Client-facing chatbot | ✅ Property Q&A | ✅ Service FAQ |
| Internal knowledge bot | ✅ Agent SOP bot | ✅ Job/crew reference |
| Output history + export | ✅ | ✅ |
| Usage dashboard | ✅ | ✅ |

---

## 2. Vertical 1 — Real Estate

### Target Users

- Independent agents and small brokerages (1–10 agents)
- Property managers
- Real estate investors who do their own outreach

### Pain Points Being Solved

| Pain | Current State | AI Solution |
|---|---|---|
| Writing listing descriptions | 30–60 min per listing, inconsistent quality | Generate in 30 seconds from form inputs |
| Buyer/seller follow-up emails | Manual, often delayed or skipped | Auto-draft from CRM trigger or form fill |
| CMA narratives | Agent writes freeform, variable quality | Structured input → polished market summary |
| Open house Q&A | Agent unavailable 24/7 | Embedded chatbot trained on listing data |
| New agent onboarding | Owner gets constant questions | Internal SOP bot answers policy/procedure |

### Module Breakdown

#### Module RE-1: Listing Description Generator

**Input Fields (form):**
- Property address
- Bedrooms / Bathrooms / Sqft
- Lot size
- Year built
- Key features (multi-select checkboxes + free text)
- Neighborhood highlights
- Price point / target buyer persona
- Tone selector: Luxury · Family · Investment · Starter Home

**Output:**
- MLS-ready short description (150–200 words)
- Long-form marketing description (300–500 words)
- Social media caption (Instagram / Facebook)
- Email teaser (subject line + 3 sentences)

**Prompt strategy:** System prompt includes agent's brand voice doc (uploaded once at onboarding). User prompt injects form data as structured JSON.

**Storage:** Save all outputs to `generated_documents` table with version history. Allow agent to regenerate with different tone.

---

#### Module RE-2: Email & Follow-up Drafter

**Use cases:**
- Post-showing follow-up to buyer
- Offer congratulations / next steps
- Price reduction announcement to interested buyers
- 30/60/90 day seller check-in
- Expired listing outreach (cold)
- Open house invitation

**Input:** Select email type → fill in 3–5 context fields → generate

**Output:** Subject line + email body, editable before copy/send

**Integration path (later):** Webhook from Follow Up Boss, kvCORE, or any CRM that supports Zapier → trigger draft generation → email agent with draft link

---

#### Module RE-3: CMA Narrative Generator

**Input:**
- Subject property details
- 3–5 comparable sales (address, sqft, beds/baths, sale price, days on market, sale date)
- Market trend notes (optional free text)
- Recommended list price range

**Output:**
- Executive summary paragraph (client-facing)
- Comparable analysis section
- Pricing rationale paragraph
- Full CMA narrative (agent can paste into their template)

**Note:** This does not replace full CMA software (RPR, Cloud CMA). It generates the written narrative section that agents currently write by hand.

---

#### Module RE-4: Property Q&A Chatbot

**How it works:**
- Agent fills out a property profile form (address, features, HOA info, school district, showing instructions, seller preferences)
- System generates an embedded chatbot widget (iframe or JS snippet)
- Bot answers buyer questions 24/7 using the property data as context
- Unknown questions → "I'll have the agent follow up" + lead capture

**Deployment:** Embed on agent's website, Linktree, or property-specific landing page

**Lead capture:** Store all chat sessions + contact info in `leads` table, notify agent via email

---

#### Module RE-5: Agent SOP / Knowledge Bot (Internal)

**How it works:**
- Agent (or broker) uploads their SOPs, commission split docs, preferred vendor lists, showing instructions, contract checklists
- Bot is password-protected, staff-only
- Agents ask natural language questions: "What's our commission split on referral leads?" → instant answer

**Value prop:** Reduces broker being texted constantly. Useful for teams with new agents.

---

## 3. Vertical 2 — Construction / Contracting

### Target Users

- Solo handymen and small crews (1–10 employees)
- General contractors
- Specialty trades: HVAC, plumbing, electrical, roofing, landscaping

### Pain Points Being Solved

| Pain | Current State | AI Solution |
|---|---|---|
| Writing proposals | Hours per proposal, inconsistent | Generate from job details in minutes |
| Scope of work documents | Rarely written; causes disputes | Structured SOW from estimate inputs |
| Customer follow-up | Forgotten or delayed | Auto-draft follow-up from job status |
| Review requests | Never sent consistently | Auto-generate personalized review ask |
| Warranty/completion letters | Not sent; liability risk | Generate on job close |
| Crew job briefings | Verbal only | Written job summary from ticket details |

### Module Breakdown

#### Module CO-1: Proposal & Estimate Writer

**Input Fields:**
- Client name / address
- Job type (dropdown: roofing, HVAC, plumbing, general, etc.)
- Scope description (free text or structured line items)
- Materials list (optional)
- Labor estimate
- Timeline
- Payment terms
- Warranty terms
- Contractor license # / insurance info (stored at account level)

**Output:**
- Branded proposal document (PDF-ready layout)
- Executive summary section
- Scope of work section
- Pricing table (formatted)
- Terms & conditions block
- Signature line block

**Later:** PDF generation via `weasyprint` or `reportlab`; download button on frontend

---

#### Module CO-2: Scope of Work (SOW) Generator

**Standalone from proposal** — some contractors need a SOW for subcontractors, permits, or client sign-off separately.

**Input:** Job type + detailed description of tasks + exclusions + site conditions

**Output:**
- Numbered task list with specifications
- Materials callouts
- Exclusions section ("Not included in this scope...")
- Assumptions section
- Change order language block

---

#### Module CO-3: Customer Communication Drafts

**Email types:**
- Initial inquiry response ("Thanks for reaching out, here's what's next...")
- Estimate ready notification
- Job scheduled confirmation
- Job start day reminder
- Mid-job status update
- Job completion summary
- Invoice reminder (soft / firm)
- Review request (Google / Yelp link)
- Referral ask

**Input:** Select type → fill 2–4 context fields → generate → copy to send

---

#### Module CO-4: Job Completion & Warranty Letter

**Input:**
- Client name / address
- Work completed (free text)
- Completion date
- Warranty period and what it covers
- Emergency contact for warranty claims
- Any post-job care instructions (e.g., "don't caulk shower for 48 hours")

**Output:**
- Formal completion letter
- Warranty certificate block
- Care instructions section

**Value:** Reduces callbacks, sets clear expectations, creates paper trail

---

#### Module CO-5: Service FAQ Chatbot (Customer-Facing)

**Trained on:**
- Services offered and pricing ranges
- Service area (zip codes)
- Scheduling process
- Warranty and guarantee policy
- FAQ ("Do you offer free estimates?", "Are you licensed and insured?")

**Deployed on:** Contractor's website or Google Business Profile link

**Lead capture:** Name, phone, project description → stored + email notification to owner

---

#### Module CO-6: Crew Job Briefing Generator

**Input:**
- Job address
- Client name + any access notes
- Scope summary
- Materials already on site vs. to bring
- Special instructions
- Expected hours

**Output:**
- Printable or text-message-ready job brief for crew lead
- Clean, scannable format (not a wall of text)

**Use case:** Owner sends this to foreman each morning instead of a phone call

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     Railway                          │
│                                                      │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────┐  │
│  │  React SPA  │───▶│  FastAPI     │───▶│Postgres │  │
│  │  (Static)   │    │  Backend     │   │         │  │
│  └─────────────┘    └──────┬───────┘   └─────────┘  │
│                            │                         │
└────────────────────────────┼────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Anthropic API  │
                    │  (Claude)       │
                    └─────────────────┘
```

### Services on Railway

| Service | Type | Notes |
|---|---|---|
| `api` | FastAPI (Python) | Main backend, Railway web service |
| `web` | React (Vite) | Static deploy via Railway or Vercel |
| `db` | PostgreSQL | Railway managed Postgres |

### Environment Variables

```
# API service
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=...
ALLOWED_ORIGINS=https://your-frontend.up.railway.app

# Per-tenant config stored in DB, not env vars
```

---

## 5. Database Schema

```sql
-- Tenants (your clients)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    vertical TEXT NOT NULL,           -- 'real_estate' | 'contracting'
    slug TEXT UNIQUE NOT NULL,        -- used in subdomain or URL
    api_key TEXT,                     -- their Anthropic key or you manage it
    brand_color TEXT DEFAULT '#2563eb',
    logo_url TEXT,
    system_prompt_override TEXT,      -- custom brand voice / rules
    monthly_token_limit INT DEFAULT 500000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (agents, contractors, staff)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',         -- 'admin' | 'user'
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Generated documents (all AI outputs)
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    module TEXT NOT NULL,             -- 're_listing' | 'co_proposal' | etc.
    input_data JSONB NOT NULL,        -- form inputs stored for regeneration
    output_text TEXT NOT NULL,
    model TEXT DEFAULT 'claude-sonnet-4-20250514',
    tokens_used INT,
    version INT DEFAULT 1,
    parent_id UUID REFERENCES generated_documents(id), -- for regenerations
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatbot sessions (for embedded bots)
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    bot_context_id UUID,              -- links to a property or service config
    session_token TEXT UNIQUE NOT NULL,
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    messages JSONB DEFAULT '[]',      -- [{role, content, timestamp}]
    lead_captured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot configurations (per property or per business)
CREATE TABLE bot_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,               -- "123 Main St Bot" or "General FAQ Bot"
    context_data JSONB NOT NULL,      -- property details, service info, FAQ
    system_prompt TEXT,               -- generated from context_data at save time
    embed_token TEXT UNIQUE NOT NULL, -- public token for iframe/JS embed
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base documents (for internal bots)
CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    filename TEXT,
    content TEXT NOT NULL,            -- extracted text
    chunk_index INT DEFAULT 0,
    embedding VECTOR(1536),           -- future: pgvector for RAG
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    event_type TEXT NOT NULL,         -- 'generation' | 'chat_message' | 'export'
    module TEXT,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. API Design (FastAPI)

### Project Structure

```
api/
├── main.py
├── config.py
├── database.py
├── models/
│   ├── tenant.py
│   ├── user.py
│   ├── document.py
│   └── chat.py
├── routers/
│   ├── auth.py
│   ├── generate.py          # All AI generation endpoints
│   ├── chat.py              # Chatbot endpoints
│   ├── documents.py         # Output history / export
│   ├── bots.py              # Bot config management
│   ├── knowledge.py         # File uploads for RAG
│   └── admin.py             # Tenant management (your use)
├── services/
│   ├── claude_service.py    # All Anthropic API calls
│   ├── prompt_builder.py    # Prompt assembly per module
│   └── usage_tracker.py
└── middleware/
    └── tenant_resolver.py   # Extracts tenant from JWT or subdomain
```

### Key Endpoints

```
POST   /auth/login
POST   /auth/register
GET    /auth/me

# Generation (all require auth + tenant context)
POST   /generate/re/listing          # RE listing description
POST   /generate/re/email            # RE email drafter
POST   /generate/re/cma              # CMA narrative
POST   /generate/co/proposal         # Contractor proposal
POST   /generate/co/sow              # Scope of work
POST   /generate/co/email            # Contractor email
POST   /generate/co/completion       # Job completion letter
POST   /generate/co/job-brief        # Crew job brief

# Document history
GET    /documents                    # List generated docs for tenant
GET    /documents/{id}               # Get single doc
POST   /documents/{id}/regenerate    # Regenerate with same inputs
DELETE /documents/{id}

# Chatbot
POST   /chat/session                 # Start new chat session (public)
POST   /chat/message                 # Send message in session (public)
GET    /chat/sessions                # List sessions (admin)
GET    /chat/leads                   # Lead captures (admin)

# Bot config
GET    /bots                         # List bot configs
POST   /bots                         # Create bot config
PUT    /bots/{id}
DELETE /bots/{id}
GET    /bots/{embed_token}/public    # Public endpoint for embed

# Usage
GET    /usage/summary                # Token usage this month
GET    /usage/history                # Daily breakdown

# Knowledge base
POST   /knowledge/upload             # Upload file, extract text
GET    /knowledge                    # List uploaded docs
DELETE /knowledge/{id}
```

### Claude Service Pattern

```python
# services/claude_service.py

import anthropic
from .prompt_builder import build_prompt
from .usage_tracker import track_usage

client = anthropic.Anthropic()

async def generate(
    module: str,
    input_data: dict,
    tenant: Tenant,
    user_id: str
) -> dict:
    system_prompt, user_prompt = build_prompt(module, input_data, tenant)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )

    output = response.content[0].text
    tokens = response.usage.input_tokens + response.usage.output_tokens

    await track_usage(tenant.id, user_id, module, tokens)

    return {"output": output, "tokens_used": tokens}
```

---

## 7. Frontend Design (React)

### Project Structure

```
web/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── config/
│   │   └── tenant.js           # Loads tenant config from API on boot
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── real-estate/
│   │   │   ├── ListingGenerator.jsx
│   │   │   ├── EmailDrafter.jsx
│   │   │   ├── CMAGenerator.jsx
│   │   │   └── BotManager.jsx
│   │   ├── contracting/
│   │   │   ├── ProposalGenerator.jsx
│   │   │   ├── SOWGenerator.jsx
│   │   │   ├── EmailDrafter.jsx
│   │   │   └── JobBrief.jsx
│   │   ├── shared/
│   │   │   ├── History.jsx
│   │   │   ├── Usage.jsx
│   │   │   └── Settings.jsx
│   │   └── ChatEmbed.jsx       # Public chatbot (no auth)
│   ├── components/
│   │   ├── GeneratorForm.jsx   # Reusable form → generate → output pattern
│   │   ├── OutputCard.jsx      # Display generated text with copy/export
│   │   ├── ChatWidget.jsx      # Embeddable chat UI
│   │   └── UsageBar.jsx
│   ├── hooks/
│   │   ├── useGenerate.js      # POST to /generate, handle loading/error
│   │   └── useTenant.js        # Tenant config context
│   └── api/
│       └── client.js           # Axios instance with auth headers
```

### UX Pattern for Generator Pages

Every generator page follows the same pattern:

```
[ Input Form ]
    ↓ user fills out fields
[ Generate Button ]
    ↓ POST to API, show spinner
[ Output Panel ]
    - Rendered markdown / formatted text
    - Copy to clipboard button
    - Export as .txt or .pdf (later)
    - Regenerate button (same inputs, new output)
    - Save to history (auto on generation)
```

### Tenant Theming

On app load, fetch `/config/public` (no auth) → returns `{ primary_color, logo_url, vertical, company_name }` → inject as CSS variables. One codebase, each client sees their brand.

---

## 8. Prompt Engineering Strategy

### System Prompt Architecture

Every module has a layered system prompt:

```
Layer 1: Role & Platform Context
  "You are an AI assistant for [Company Name], a [vertical] business.
   You generate professional [document type] based on structured inputs."

Layer 2: Brand Voice (from tenant config)
  "Writing style: [uploaded brand voice doc or default for vertical]"

Layer 3: Output Format Instructions
  "Return your response as follows:
   ## Short Description
   [content]
   ## Long Description
   [content]"

Layer 4: Quality Rules
  "Do not fabricate specific facts. If a field is missing, acknowledge
   it naturally rather than inventing data. Keep tone consistent throughout."
```

### Module-Specific Prompt Templates

Store base prompt templates in code (`prompt_builder.py`). Tenant-level overrides stored in `tenants.system_prompt_override` in DB. Merge at request time.

### Handling Missing Inputs

Instruct Claude to handle gaps gracefully:
- Optional fields not filled → omit that section, don't hallucinate
- Use `{{if field}}` logic in prompt templates to conditionally include sections

---

## 9. Railway Deployment

### Service Configuration

**`railway.toml` (repo root):**

```toml
[build]
  builder = "NIXPACKS"

[[services]]
  name = "api"
  source = "api/"
  [services.deploy]
    startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
  [services.variables]
    DATABASE_URL = "${{Postgres.DATABASE_URL}}"
    ANTHROPIC_API_KEY = "${{ANTHROPIC_API_KEY}}"
    SECRET_KEY = "${{SECRET_KEY}}"

[[services]]
  name = "web"
  source = "web/"
  [services.build]
    buildCommand = "npm run build"
    outputDirectory = "dist"
```

### Monorepo Layout

```
claude-automation-platform/
├── api/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile            # optional if nixpacks doesn't pick up correctly
├── web/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── railway.toml
└── README.md
```

### Database Migrations

Use **Alembic** for migrations:

```bash
# Initial setup
alembic init migrations
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

Add migration run to Railway deploy command:
```
alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Cost Estimate on Railway

| Resource | Estimated Cost |
|---|---|
| FastAPI web service | ~$5–10/mo (Hobby plan) |
| PostgreSQL | ~$5/mo (Hobby plan) |
| Static frontend | Free (Railway static) |
| **Total infra per client** | **~$10–15/mo** |

Claude API costs are additional — usage-based. At moderate SMB volume (~100 generations/mo per client), expect $5–20/mo in API costs. Charge clients $150–350/mo retainer → healthy margin.

### Per-Client Isolation Options

**Option A (recommended to start):** One Railway project, multi-tenant in DB. All clients share one deployment. Cheapest. Use `tenant_id` RLS or application-level filtering.

**Option B (for premium clients):** Fork the project per client, separate Railway environment. Full isolation, own DB. Justified at $500+/mo retainer.

---

## 10. Multi-Tenant Client Model

### Onboarding a New Client

1. Insert row into `tenants` table (slug, vertical, brand config)
2. Create their admin user account
3. Send them login link to `https://your-platform.up.railway.app` (or custom domain later)
4. Onboarding wizard (first login): upload brand voice doc, set preferences, configure first bot
5. Done — they're live in under 1 hour

### White-Label Path (Future)

- Add custom domain support (CNAME → Railway)
- Each client gets `app.theircompany.com`
- Railway supports custom domains per service

### Access Control

```
Tenant Admin:  full access to all modules + user management + usage
Tenant User:   access to modules only, no admin panel
Super Admin:   (you) access to all tenants, usage dashboards, billing
```

---

## 11. Build Order & Milestones

### Phase 1 — Foundation (Week 1–2)

- [ ] Monorepo setup: FastAPI + React + Postgres
- [ ] Auth system: JWT login, user/tenant tables
- [ ] Tenant middleware and context injection
- [ ] Railway project setup, environment variables, first deploy
- [ ] Base `GeneratorForm` + `OutputCard` React components

### Phase 2 — Real Estate MVP (Week 3–4)

- [ ] `RE-1`: Listing description generator (form → Claude → display)
- [ ] `RE-2`: Email drafter (5 email types)
- [ ] Document history page (list + view + copy)
- [ ] Tenant branding (logo, color, company name)
- [ ] First client demo ready

### Phase 3 — Contracting MVP (Week 5–6)

- [ ] `CO-1`: Proposal writer
- [ ] `CO-2`: SOW generator
- [ ] `CO-3`: Customer email drafter
- [ ] Shared usage dashboard
- [ ] Export to .txt (copy-friendly)

### Phase 4 — Chatbot (Week 7–8)

- [ ] Bot config form (property or business setup)
- [ ] Public chat endpoint (no auth)
- [ ] Embeddable `ChatWidget.jsx` (iframe + JS snippet options)
- [ ] Lead capture + email notification
- [ ] Chat session history in admin

### Phase 5 — Polish & Expand (Week 9–12)

- [ ] `RE-3`: CMA narrative generator
- [ ] `CO-4`: Job completion / warranty letter
- [ ] `CO-6`: Crew job brief
- [ ] PDF export (weasyprint or Puppeteer)
- [ ] Knowledge base upload (internal bot)
- [ ] Usage limits + overage alerts
- [ ] Custom domain support

---

## 12. Pricing & Packaging Per Client

### What to Charge

| Tier | One-Time Build | Monthly Retainer | Includes |
|---|---|---|---|
| **Solo Agent / 1-Man Crew** | $1,500 | $150/mo | 2 modules, basic branding, email support |
| **Small Team (2–5 users)** | $3,500 | $300/mo | 4 modules, chatbot, lead notifications |
| **Office / Full Service** | $6,000–8,000 | $500–750/mo | All modules, custom domain, monthly review call |

### Your Costs Per Client (Monthly)

| Cost | Amount |
|---|---|
| Railway infra (shared) | ~$3–5 (amortized across clients) |
| Claude API (moderate usage) | ~$10–25 |
| Your time (maintenance) | ~1–2 hrs |
| **Total hard cost** | **~$15–30/mo** |

**Margin on $150/mo retainer: ~80%**

### Upsell Path

After 60 days on a basic plan:
- Additional modules: $500–1,000 one-time per module
- Chatbot add-on: $750 setup + $100/mo
- Custom domain: $200 one-time
- Staff training session: $300 flat
- Additional user seats: $50/mo each

---

*Last updated: May 2026 · Stack: React + Vite · FastAPI · PostgreSQL · Railway · Anthropic Claude API*