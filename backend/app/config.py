from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Groq
    groq_api_key: str
    groq_model: str = "llama-3.1-8b-instant"

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


# Single instance imported everywhere
settings = Settings()
