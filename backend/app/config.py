from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # GitHub Models (Azure AI inference)
    github_token: str
    llm_model: str = "gpt-4o-mini"

    # App
    env: str = "local"
    frontend_url: str = "http://localhost:3000"

    # Cosmos DB
    # Local emulator on macOS/Linux Docker typically uses plain HTTP
    cosmos_endpoint: str = "http://localhost:8081"
    cosmos_key: str = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b5n="
    cosmos_database: str = "adaptive-quiz"
    disable_ssl_verify: bool = True

    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # silently drop unknown env vars (e.g. old GROQ_* keys)


# Single instance imported everywhere
settings = Settings()
