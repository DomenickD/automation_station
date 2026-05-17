#!/usr/bin/env bash
# start.sh — local dev launcher for Automation Station
#
# Reads ENV from api/.env to decide which LLM backend to use:
#   ENV=development  →  spins up Ollama in Docker, pulls gemma4:e4b, uses it as LLM mock
#   ENV=production   →  uses Anthropic Claude API (ANTHROPIC_API_KEY must be set)
#
# Usage:
#   bash start.sh          # auto-detects mode from api/.env
#   bash start.sh --dev    # force development mode
#   bash start.sh --prod   # force production mode

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/api"
WEB_DIR="$ROOT/web"

# ── Colors ───────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Automation Station — Start       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Check .env files ─────────────────────────────────────────
if [ ! -f "$API_DIR/.env" ]; then
  echo -e "${YELLOW}⚠  api/.env not found — copying from .env.example${NC}"
  cp "$API_DIR/.env.example" "$API_DIR/.env"
  echo -e "${RED}   → Edit api/.env before continuing.${NC}"
fi

if [ ! -f "$WEB_DIR/.env" ]; then
  echo -e "${YELLOW}⚠  web/.env not found — copying from .env.example${NC}"
  cp "$WEB_DIR/.env.example" "$WEB_DIR/.env"
fi

# ── Determine ENV mode ────────────────────────────────────────
# CLI flag overrides .env value
if [ "$1" = "--dev" ]; then
  APP_ENV="development"
elif [ "$1" = "--prod" ]; then
  APP_ENV="production"
else
  # Read ENV= line from api/.env (ignore comments, strip quotes/spaces)
  APP_ENV=$(grep -E '^ENV=' "$API_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | tr '[:upper:]' '[:lower:]')
  APP_ENV="${APP_ENV:-development}"
fi

# Read Ollama config from .env (with fallbacks)
OLLAMA_URL=$(grep -E '^OLLAMA_URL=' "$API_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
OLLAMA_MODEL=$(grep -E '^OLLAMA_MODEL=' "$API_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
OLLAMA_MODEL="${OLLAMA_MODEL:-gemma4:e4b}"

if [ "$APP_ENV" = "development" ]; then
  echo -e "  Mode: ${MAGENTA}DEVELOPMENT${NC} — LLM routed through Ollama (${OLLAMA_MODEL})"
else
  echo -e "  Mode: ${GREEN}PRODUCTION${NC}  — LLM routed through Anthropic Claude API"
fi
echo ""

# ══════════════════════════════════════════════════════════════
# DEV MODE — Ollama Docker setup
# ══════════════════════════════════════════════════════════════
OLLAMA_PID=""
OLLAMA_CONTAINER="automation-station-ollama"

if [ "$APP_ENV" = "development" ]; then
  echo -e "${MAGENTA}[DEV]${NC} Checking Docker..."

  if ! command -v docker &>/dev/null; then
    echo -e "${RED}  ✗ Docker not found. Install Docker Desktop and retry.${NC}"
    echo -e "${YELLOW}    Or set ENV=production in api/.env to use the Claude API instead.${NC}"
    exit 1
  fi

  if ! docker info &>/dev/null; then
    echo -e "${RED}  ✗ Docker daemon is not running. Start Docker Desktop and retry.${NC}"
    exit 1
  fi

  echo -e "${MAGENTA}[DEV]${NC} Starting Ollama container (${OLLAMA_CONTAINER})..."

  # If container exists but is stopped, restart it; otherwise create fresh
  if docker ps -a --format '{{.Names}}' | grep -q "^${OLLAMA_CONTAINER}$"; then
    if ! docker ps --format '{{.Names}}' | grep -q "^${OLLAMA_CONTAINER}$"; then
      echo -e "  → Restarting existing container..."
      docker start "$OLLAMA_CONTAINER" > /dev/null
    else
      echo -e "  → Container already running."
    fi
  else
    echo -e "  → Creating new Ollama container..."
    docker run -d \
      --name "$OLLAMA_CONTAINER" \
      -p 11434:11434 \
      -v ollama-data:/root/.ollama \
      ollama/ollama > /dev/null
  fi

  # Wait for Ollama API to be ready
  echo -e "${MAGENTA}[DEV]${NC} Waiting for Ollama to be ready..."
  for i in $(seq 1 30); do
    if curl -sf "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} Ollama is ready."
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo -e "${RED}  ✗ Ollama did not start in time. Check: docker logs ${OLLAMA_CONTAINER}${NC}"
      exit 1
    fi
    sleep 1
  done

  # Check if model is already pulled
  if docker exec "$OLLAMA_CONTAINER" ollama list 2>/dev/null | grep -q "${OLLAMA_MODEL}"; then
    echo -e "${MAGENTA}[DEV]${NC} Model ${OLLAMA_MODEL} already present — skipping pull."
  else
    echo -e "${MAGENTA}[DEV]${NC} Pulling ${OLLAMA_MODEL} (this may take a few minutes on first run)..."
    docker exec "$OLLAMA_CONTAINER" ollama pull "$OLLAMA_MODEL"
    echo -e "  ${GREEN}✓${NC} Model ready."
  fi

  echo ""
fi

# ══════════════════════════════════════════════════════════════
# PRODUCTION MODE — validate Anthropic key is set
# ══════════════════════════════════════════════════════════════
if [ "$APP_ENV" = "production" ]; then
  ANTHROPIC_KEY=$(grep -E '^ANTHROPIC_API_KEY=' "$API_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
  if [ -z "$ANTHROPIC_KEY" ] || [ "$ANTHROPIC_KEY" = "sk-ant-..." ]; then
    echo -e "${RED}  ✗ ANTHROPIC_API_KEY is not set in api/.env${NC}"
    echo -e "${YELLOW}    Set it or switch to ENV=development to use Ollama instead.${NC}"
    exit 1
  fi
  echo -e "  ${GREEN}✓${NC} Anthropic API key found."
  echo ""
fi

# ══════════════════════════════════════════════════════════════
# Shared setup
# ══════════════════════════════════════════════════════════════
echo -e "${GREEN}[1/4]${NC} Setting up Python virtual environment..."
cd "$API_DIR"

if [ ! -d ".venv" ]; then
  python -m venv .venv
fi

if [ -f ".venv/Scripts/activate" ]; then
  source .venv/Scripts/activate   # Windows Git Bash
else
  source .venv/bin/activate
fi

echo -e "${GREEN}[2/4]${NC} Installing Python dependencies..."
pip install -r requirements.txt -q

echo -e "${GREEN}[3/4]${NC} Running database migrations..."
alembic upgrade head || {
  echo -e "${RED}   Migration failed. Is PostgreSQL running and DATABASE_URL set in api/.env?${NC}"
  echo -e "${YELLOW}   Skipping — backend may not work until DB is available.${NC}"
}

echo -e "${GREEN}[4/4]${NC} Installing Node dependencies..."
cd "$WEB_DIR"
npm install --silent

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}✓${NC} Setup complete! Starting servers..."
echo ""
echo -e "  Frontend  →  ${CYAN}http://localhost:5173${NC}"
echo -e "  API       →  ${CYAN}http://localhost:8000${NC}"
echo -e "  API docs  →  ${CYAN}http://localhost:8000/docs${NC}"
if [ "$APP_ENV" = "development" ]; then
  echo -e "  Ollama    →  ${CYAN}${OLLAMA_URL}${NC}  (model: ${OLLAMA_MODEL})"
fi
echo ""
echo -e "  Login (after seeding): ${YELLOW}admin@demo.com / changeme123${NC}"
echo -e "  Tenant slugs:          ${YELLOW}demo-re${NC}  (real estate)   ${YELLOW}demo-co${NC}  (contracting)"
echo ""
echo -e "  To seed demo data:  cd api && python seed.py"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop all servers."
echo ""

# ── Launch servers ────────────────────────────────────────────
cd "$API_DIR"

if [ -f ".venv/Scripts/activate" ]; then
  source .venv/Scripts/activate
else
  source .venv/bin/activate
fi

uvicorn main:app --reload --port 8000 &
API_PID=$!

cd "$WEB_DIR"
npm run dev &
WEB_PID=$!

# On Ctrl+C: kill servers (Ollama container is intentionally left running
# so the model stays cached — stop it manually with: docker stop automation-station-ollama)
cleanup() {
  echo ""
  echo -e "Stopping API and frontend..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  if [ "$APP_ENV" = "development" ]; then
    echo -e "${YELLOW}Note: Ollama container '${OLLAMA_CONTAINER}' is still running (model stays cached).${NC}"
    echo -e "  Stop it manually:  docker stop ${OLLAMA_CONTAINER}"
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM

wait "$API_PID" "$WEB_PID"
