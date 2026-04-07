from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    environment: str = os.getenv("NODE_ENV", os.getenv("ENVIRONMENT", "development"))
    # Database
    mongodb_uri: str = os.getenv("DB_URI", os.getenv("MONGODB_URI", "mongodb://localhost:27017/academic_platform"))

    # Models & AI
    model_name: str = os.getenv("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    openai_max_tokens: int = int(os.getenv("OPENAI_MAX_TOKENS", "500"))
    openai_temperature: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    huggingface_token: str = os.getenv("HUGGINGFACE_HUB_TOKEN", os.getenv("HF_TOKEN", ""))
    model_load_strategy: str = os.getenv("MODEL_LOAD_STRATEGY", "startup")
    model_load_timeout_seconds: int = int(os.getenv("MODEL_LOAD_TIMEOUT_SECONDS", "180"))
    model_load_retries: int = int(os.getenv("MODEL_LOAD_RETRIES", "3"))
    model_load_retry_base_delay_seconds: float = float(
        os.getenv("MODEL_LOAD_RETRY_BASE_DELAY_SECONDS", "2")
    )
    model_warmup_text: str = os.getenv(
        "MODEL_WARMUP_TEXT",
        "academic search warmup",
    )

    # Cache
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "86400"))  # 24 hours

    # Server & API
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:5000")
    port: int = int(os.getenv("PORT", "8000"))
    log_level: str = os.getenv("LOG_LEVEL", "info")
    max_request_size_bytes: int = int(os.getenv("MAX_REQUEST_SIZE_BYTES", str(2 * 1024 * 1024)))
    max_input_length: int = int(os.getenv("MAX_INPUT_LENGTH", "5000"))
    request_timeout_seconds: float = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "45"))
    db_connect_timeout_seconds: float = float(os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "10"))
    db_connect_retries: int = int(os.getenv("DB_CONNECT_RETRIES", "3"))
    db_connect_retry_base_delay_seconds: float = float(
        os.getenv("DB_CONNECT_RETRY_BASE_DELAY_SECONDS", "2")
    )
    openai_retries: int = int(os.getenv("OPENAI_RETRIES", "3"))
    openai_retry_base_delay_seconds: float = float(
        os.getenv("OPENAI_RETRY_BASE_DELAY_SECONDS", "2")
    )
    rate_limit_window_seconds: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    rate_limit_requests: int = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))
    ai_rate_limit_requests: int = int(os.getenv("AI_RATE_LIMIT_REQUESTS", "15"))
    ai_service_api_key: str = os.getenv("AI_SERVICE_API_KEY", "")
    metrics_api_key: str = os.getenv("METRICS_API_KEY", "")
    worker_count: int = int(os.getenv("WORKER_COUNT", "1"))

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
