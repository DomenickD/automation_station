from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/automation_station"
    anthropic_api_key: str = ""
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # "development" → Ollama/gemma4:e4b   "production" → Anthropic Claude
    env: str = "development"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma4:e4b"
    tavily_api_key: str = ""

    class Config:
        env_file = ".env"

    @property
    def is_dev(self) -> bool:
        return self.env.lower() == "development"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
