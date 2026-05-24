"""
LLM service — routes to Ollama (dev) or Anthropic Claude (production).

  ENV=development  →  Ollama at OLLAMA_URL running OLLAMA_MODEL (gemma4:e4b)
  ENV=production   →  Anthropic Claude API (claude-sonnet-4-6)

The public surface (generate / chat_response) is identical in both modes so
nothing else in the codebase needs to know which backend is active.
"""
import httpx
import anthropic
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from models.tenant import Tenant
from services.prompt_builder import build_prompt
from services.usage_tracker import track_usage

settings = get_settings()

# ── Anthropic (production) ────────────────────────────────────────────────────

def _anthropic_client(tenant: Tenant) -> anthropic.AsyncAnthropic:
    api_key = tenant.api_key or settings.anthropic_api_key
    return anthropic.AsyncAnthropic(api_key=api_key)


async def _claude_generate(system_prompt: str, user_prompt: str, tenant: Tenant, max_tokens: int) -> tuple[str, int]:
    client = _anthropic_client(tenant)
    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="AI rate limit reached. Please try again in a moment.")
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=502, detail="AI service configuration error.")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")
    text = response.content[0].text
    tokens = response.usage.input_tokens + response.usage.output_tokens
    return text, tokens


async def _claude_chat(messages: list[dict], system_prompt: str, tenant: Tenant) -> tuple[str, int]:
    client = _anthropic_client(tenant)
    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=system_prompt,
            messages=messages,
        )
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="AI rate limit reached. Please try again in a moment.")
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=502, detail="AI service configuration error.")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")
    tokens = response.usage.input_tokens + response.usage.output_tokens
    return response.content[0].text, tokens


# ── Ollama (development) ──────────────────────────────────────────────────────

async def _ollama_chat_api(ollama_messages: list[dict], max_tokens: int) -> tuple[str, int]:
    """POST to Ollama /api/chat — returns (text, token_count)."""
    payload = {
        "model": settings.ollama_model,
        "messages": ollama_messages,
        "stream": False,
        "keep_alive": -1,
        "options": {"num_predict": max_tokens},
    }
    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(f"{settings.ollama_url}/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()

    text = data["message"]["content"]
    # Ollama reports prompt + completion token counts
    tokens = data.get("prompt_eval_count", 0) + data.get("eval_count", 0)
    return text, tokens


async def _ollama_generate(system_prompt: str, user_prompt: str, max_tokens: int) -> tuple[str, int]:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    return await _ollama_chat_api(messages, max_tokens)


async def _ollama_chat(messages: list[dict], system_prompt: str) -> tuple[str, int]:
    ollama_messages = [{"role": "system", "content": system_prompt}] + [
        {"role": m["role"], "content": m["content"]} for m in messages
    ]
    return await _ollama_chat_api(ollama_messages, max_tokens=512)


# ── Public interface ──────────────────────────────────────────────────────────

async def generate(
    module: str,
    input_data: dict,
    tenant: Tenant,
    user_id: str,
    db: AsyncSession,
) -> dict:
    system_prompt, user_prompt = build_prompt(module, input_data, tenant)

    if settings.is_dev:
        text, tokens = await _ollama_generate(system_prompt, user_prompt, max_tokens=2048)
    else:
        text, tokens = await _claude_generate(system_prompt, user_prompt, tenant, max_tokens=2048)

    await track_usage(tenant.id, user_id, "generation", module, tokens, db)
    return {"output": text, "tokens_used": tokens}


async def chat_response(
    messages: list[dict],
    system_prompt: str,
    tenant: Tenant,
    db: AsyncSession,
) -> str:
    if settings.is_dev:
        text, tokens = await _ollama_chat(messages, system_prompt)
    else:
        text, tokens = await _claude_chat(messages, system_prompt, tenant)

    await track_usage(tenant.id, None, "chat_message", None, tokens, db)
    return text
