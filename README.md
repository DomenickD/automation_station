# Automation Station

AI automation SaaS for real estate and contracting businesses. Multi-tenant platform powered by Claude.

## Stack

- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **AI (production)**: Anthropic Claude API (`claude-sonnet-4-6`)
- **AI (development)**: Ollama running `gemma4:e4b` locally via Docker
- **Hosting**: Railway

---

## Dev vs Production Mode

The platform routes all LLM calls through a single service (`api/services/claude_service.py`). The active backend is controlled by a single env variable:

| `ENV` value | LLM backend | Requires |
|---|---|---|
| `development` | Ollama in Docker (`gemma4:e4b`) | Docker Desktop running |
| `production` | Anthropic Claude API | `ANTHROPIC_API_KEY` set |

Set it in `api/.env`:

```env
ENV=development   # local — free, no API key needed
# ENV=production  # live — uses Claude, requires ANTHROPIC_API_KEY
```

No other code changes needed — the service layer handles the routing transparently.

---

## Quick Start

### 1. Copy env files

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
```

Edit `api/.env` — at minimum set:
- `DATABASE_URL` (pointing at your local Postgres)
- `SECRET_KEY` (any random string)
- `ENV=development` to use Ollama, or `ENV=production` + `ANTHROPIC_API_KEY` for Claude

### 2. Run

```bash
bash start.sh
```

`start.sh` auto-detects `ENV` from `api/.env` and handles everything:

**In development mode** (`ENV=development`):
1. Checks Docker is running
2. Starts the `automation-station-ollama` Docker container (port `11434`)
3. Pulls `gemma4:e4b` if not already cached (first run only, ~2–3 min)
4. Creates Python venv + installs deps
5. Runs Alembic migrations
6. Installs Node deps
7. Starts FastAPI (`http://localhost:8000`) and Vite (`http://localhost:5173`)

**In production mode** (`ENV=production`):
- Same as above but skips Ollama, validates `ANTHROPIC_API_KEY` is present

### CLI flags (override .env)

```bash
bash start.sh --dev    # force development mode
bash start.sh --prod   # force production mode
```

### 3. Seed demo data

```bash
cd api
python seed.py
```

Creates two tenants and an admin user:

| Tenant slug | Vertical | Login |
|---|---|---|
| `demo-re` | Real estate | `admin@demo.com` / `changeme123` |
| `demo-co` | Contracting | `admin@demo.com` / `changeme123` |

### Frontend in Docker

You can also run Postgres and the Vite frontend in Docker for local dev:

```bash
docker compose up -d postgres web
```

The app will be available at `http://localhost:5173`. Keep the API running on your host at `http://localhost:8000`. The Docker Postgres service matches the default `api/.env` database URL:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/automation_station
```

The frontend talks to the host API through `web/.env`:

```env
VITE_API_URL=http://localhost:8000
```

To enable automated CMA comparable research, add a Tavily key to `api/.env`:

```env
TAVILY_API_KEY=tvly-...
```

Without that key, the CMA page still provides verification search links and keeps the manual comparable workflow.

After starting Postgres, run migrations and seed the demo login:

```bash
cd api
alembic upgrade head
python seed.py
```

The frontend container mounts `web/` for hot reload and stores `node_modules` in a Docker volume.

---

## Modules

### Real Estate
- **RE-1** Listing Description Generator (MLS + social + email teaser)
- **RE-2** Email Drafter (8 email types)
- **RE-3** CMA Narrative Generator
- **RE-4** Property Q&A Chatbot (embeddable widget)

### Contracting
- **CO-1** Proposal Writer
- **CO-2** Scope of Work Generator
- **CO-3** Customer Email Drafter (9 email types)
- **CO-4** Job Completion & Warranty Letter
- **CO-5** Service FAQ Chatbot (embeddable widget)
- **CO-6** Crew Job Brief Generator

---

## Ollama Notes

The Ollama Docker container is **left running** after you Ctrl+C so the model stays cached across restarts. To stop it manually:

```bash
docker stop automation-station-ollama
```

To restart it on the next `bash start.sh` run, the script will `docker start` the existing container (no re-pull needed).

To use a different local model, change `OLLAMA_MODEL` in `api/.env`:

```env
OLLAMA_MODEL=llama3.2:3b   # smaller/faster
OLLAMA_MODEL=gemma4:e4b    # default
```

---

## Chatbot Embed

After creating a bot in the dashboard, copy the embed snippet:

```html
<script src="https://your-domain/embed.js" data-token="YOUR_BOT_TOKEN"></script>
```

---

## Deploy to Railway (Production)

1. Push repo to GitHub
2. New Railway project → Deploy from GitHub
3. Add PostgreSQL plugin → Railway auto-sets `DATABASE_URL`
4. Set environment variables:
   - `ENV=production`
   - `ANTHROPIC_API_KEY=sk-ant-...`
   - `SECRET_KEY=<random string>`
   - `ALLOWED_ORIGINS=https://your-frontend.up.railway.app`
5. Railway runs `alembic upgrade head` then starts the API automatically

> Ollama is **not** used in production. Railway deployments always use the Claude API.
