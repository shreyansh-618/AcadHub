from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/academic_platform")
    model_name: str = os.getenv("MODEL_NAME", "sentence-transformers/paraphrase-MiniLM-L6-v2")
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:3000")
    port: int = int(os.getenv("PORT", "8000"))
    log_level: str = os.getenv("LOG_LEVEL", "info")
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
