#!/usr/bin/env bash
# Local launcher for Automation Station.
#
# Usage:
#   bash start.sh          # uses ENV from api/.env, defaults to development
#   bash start.sh --dev    # force development mode
#   bash start.sh --prod   # force production mode
#
# Development mode: all services run in Docker Compose containers.
#   Migrations and seeding run inside the api container on startup.
#   Code changes hot-reload in both api and web containers.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/api"
WEB_DIR="$ROOT/web"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

read_env_value() {
  local file="$1"
  local key="$2"
  { grep -E "^${key}=" "$file" 2>/dev/null || true; } | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' '
}

ensure_env_files() {
  if [ ! -f "$API_DIR/.env" ]; then
    echo -e "${YELLOW}api/.env not found; copying api/.env.example${NC}"
    cp "$API_DIR/.env.example" "$API_DIR/.env"
  fi

  if [ ! -f "$WEB_DIR/.env" ]; then
    echo -e "${YELLOW}web/.env not found; copying web/.env.example${NC}"
    cp "$WEB_DIR/.env.example" "$WEB_DIR/.env"
  fi
}

detect_env() {
  if [ "${1:-}" = "--dev" ]; then
    echo "development"
  elif [ "${1:-}" = "--prod" ]; then
    echo "production"
  else
    local env_value
    env_value="$(read_env_value "$API_DIR/.env" "ENV" | tr '[:upper:]' '[:lower:]')"
    echo "${env_value:-development}"
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}Docker was not found. Install Docker Desktop and retry.${NC}"
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Docker daemon is not running. Start Docker Desktop and retry.${NC}"
    exit 1
  fi
}

wait_for_postgres() {
  echo -e "${MAGENTA}[DEV]${NC} Waiting for Postgres..."
  for _ in $(seq 1 30); do
    if docker exec automation-station-postgres pg_isready -U postgres -d automation_station >/dev/null 2>&1; then
      echo -e "  ${GREEN}Postgres is ready.${NC}"
      return 0
    fi
    sleep 1
  done
  echo -e "${RED}Postgres did not become ready in time.${NC}"
  echo -e "${YELLOW}Check logs with: docker compose logs postgres${NC}"
  exit 1
}

wait_for_api() {
  echo -e "${MAGENTA}[DEV]${NC} Waiting for API (migrations + seed run on first start)..."
  for _ in $(seq 1 60); do
    if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
      echo -e "  ${GREEN}API is ready.${NC}"
      return 0
    fi
    sleep 2
  done
  echo -e "${RED}API did not become ready in time.${NC}"
  echo -e "${YELLOW}Check logs with: docker compose logs api${NC}"
  exit 1
}

wait_for_ollama() {
  local ollama_url="$1"
  echo -e "${MAGENTA}[DEV]${NC} Waiting for Ollama..."
  for _ in $(seq 1 30); do
    if curl -sf "${ollama_url}/api/tags" >/dev/null 2>&1; then
      echo -e "  ${GREEN}Ollama is ready.${NC}"
      return 0
    fi
    sleep 1
  done
  echo -e "${RED}Ollama did not become ready in time.${NC}"
  echo -e "${YELLOW}Check logs with: docker compose logs ollama${NC}"
  exit 1
}

ensure_ollama_model() {
  local model="$1"
  if docker exec automation-station-ollama ollama list 2>/dev/null | grep -q "$model"; then
    echo -e "${MAGENTA}[DEV]${NC} Ollama model ${model} already present."
    return 0
  fi
  echo -e "${MAGENTA}[DEV]${NC} Pulling Ollama model ${model}..."
  docker exec automation-station-ollama ollama pull "$model"
}

# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}Automation Station - Start${NC}"
echo ""

ensure_env_files
APP_ENV="$(detect_env "${1:-}")"
OLLAMA_URL="$(read_env_value "$API_DIR/.env" "OLLAMA_URL")"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
OLLAMA_MODEL="$(read_env_value "$API_DIR/.env" "OLLAMA_MODEL")"
OLLAMA_MODEL="${OLLAMA_MODEL:-gemma4:e4b}"

if [ "$APP_ENV" = "development" ]; then
  echo -e "Mode: ${MAGENTA}DEVELOPMENT${NC} (all services in Docker)"
  require_docker

  echo -e "${MAGENTA}[DEV]${NC} Building and starting all containers..."
  cd "$ROOT"
  docker compose up --build -d

  wait_for_postgres
  wait_for_api
  wait_for_ollama "$OLLAMA_URL"
  ensure_ollama_model "$OLLAMA_MODEL"

  echo ""
  echo -e "${GREEN}Development environment is running.${NC}"
  echo -e "  Frontend: ${CYAN}http://localhost:5173${NC}"
  echo -e "  API:      ${CYAN}http://localhost:8000${NC}"
  echo -e "  API docs: ${CYAN}http://localhost:8000/docs${NC}"
  echo -e "  Ollama:   ${CYAN}${OLLAMA_URL}${NC} (${OLLAMA_MODEL})"
  echo ""
  echo -e "  Login:        ${YELLOW}admin@demo.com / changeme123${NC}"
  echo -e "  Tenant slugs: ${YELLOW}demo-re${NC}, ${YELLOW}demo-co${NC}"
  echo ""
  echo -e "  View logs:  ${CYAN}docker compose logs -f${NC}"
  echo -e "  Stop all:   ${CYAN}docker compose down${NC}"
  echo ""

else
  echo -e "Mode: ${GREEN}PRODUCTION${NC}"
  ANTHROPIC_KEY="$(read_env_value "$API_DIR/.env" "ANTHROPIC_API_KEY")"
  if [ -z "$ANTHROPIC_KEY" ] || [ "$ANTHROPIC_KEY" = "sk-ant-..." ]; then
    echo -e "${RED}ANTHROPIC_API_KEY is not set in api/.env.${NC}"
    exit 1
  fi

  require_docker

  echo -e "${GREEN}[1/1]${NC} Building and starting production containers..."
  cd "$ROOT"
  docker compose up --build -d

  wait_for_postgres
  wait_for_api

  echo ""
  echo -e "${GREEN}Production-mode containers are running.${NC}"
  echo -e "  Frontend: ${CYAN}http://localhost:5173${NC}"
  echo -e "  API:      ${CYAN}http://localhost:8000${NC}"
  echo -e "  API docs: ${CYAN}http://localhost:8000/docs${NC}"
  echo ""
  echo -e "  View logs:  ${CYAN}docker compose logs -f${NC}"
  echo -e "  Stop all:   ${CYAN}docker compose down${NC}"
  echo ""
fi
