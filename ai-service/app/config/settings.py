from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    # Database
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/academic_platform")
    
    # Models & AI
    model_name: str = os.getenv("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    openai_max_tokens: int = int(os.getenv("OPENAI_MAX_TOKENS", "500"))
    openai_temperature: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    
    # Cache
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "86400"))  # 24 hours
    
    # Server & API
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:5000")
    port: int = int(os.getenv("PORT", "8000"))
    log_level: str = os.getenv("LOG_LEVEL", "info")
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
