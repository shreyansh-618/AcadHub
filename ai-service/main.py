from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4
import asyncio
import logging

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config.database import close_db, init_db
from app.config.settings import settings
from app.routes import document_intelligence, embed, health, qa, search
from app.services.embedding import embedding_service
from app.services.metrics import metrics_service
from app.services.rate_limiter import rate_limiter
from app.services.runtime_state import runtime_state
from app.utils.resilience import retry_async

load_dotenv()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="[%(asctime)s] %(levelname)s: %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

configured_origins = [
    origin.strip()
    for origin in settings.cors_origin.split(",")
    if origin.strip()
]

if settings.environment == "production" and not configured_origins:
    raise RuntimeError("CORS_ORIGIN must be set to your frontend domain(s) in production")


async def run_startup_tasks() -> None:
    logger.info("Startup: initializing database connection")
    try:
        await asyncio.wait_for(init_db(), timeout=settings.db_connect_timeout_seconds)
    except asyncio.TimeoutError:
        runtime_state.set_db_status("failed", "Database initialization timed out")
        logger.error("Startup: database initialization timed out")
    except Exception as exc:
        runtime_state.set_db_status("failed", str(exc))
        logger.exception("Startup: database initialization failed")

    load_strategy = settings.model_load_strategy.strip().lower()
    if load_strategy not in {"startup", "lazy"}:
        load_strategy = "startup"

    runtime_state.set_model_status("idle", model_name=settings.model_name)

    if load_strategy == "lazy":
        logger.info("Startup: model load strategy is lazy")
        runtime_state.mark_ready()
        return

    logger.info("Startup: loading embedding model using '%s' strategy", load_strategy)
    try:
        await asyncio.wait_for(
            retry_async(
                lambda: asyncio.to_thread(embedding_service.warmup),
                retries=settings.model_load_retries,
                base_delay_seconds=settings.model_load_retry_base_delay_seconds,
                operation_name="Embedding model warmup",
            ),
            timeout=settings.model_load_timeout_seconds,
        )
    except asyncio.TimeoutError:
        runtime_state.set_model_status(
            "failed",
            model_name=settings.model_name,
            error="Model loading timed out",
        )
        logger.error("Startup: model load timed out after %ss", settings.model_load_timeout_seconds)
    except Exception:
        logger.exception("Startup: model load failed")

    runtime_state.mark_ready()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI service starting")
    await run_startup_tasks()
    snapshot = runtime_state.snapshot()
    logger.info("Startup summary: db=%s model=%s ready=%s", snapshot["database"]["status"], snapshot["model"]["status"], snapshot["ready"])
    logger.info("Deployment config: worker_count=%s model_strategy=%s", settings.worker_count, settings.model_load_strategy)
    logger.info("AI service ready to serve")
    yield
    logger.info("AI service shutting down")
    await close_db()


app = FastAPI(
    title="Academic Platform AI Service",
    description="Semantic search and embeddings service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def request_limits_and_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    started_at = perf_counter()
    client_ip = request.client.host if request.client else "unknown"
    api_key = settings.ai_service_api_key.strip()
    metrics_key = settings.metrics_api_key.strip()
    path = request.url.path
    is_public_operational_path = path in {"/api/v1/health", "/api/v1/metrics"}

    if path == "/api/v1/metrics" and metrics_key:
        provided_metrics_key = request.headers.get("x-metrics-key", "")
        if provided_metrics_key != metrics_key:
            metrics_service.record_request(path, 401, 0.0)
            return JSONResponse(
                status_code=401,
                content={
                    "code": "UNAUTHORIZED",
                    "message": "Invalid metrics API key",
                    "request_id": request_id,
                },
                headers={"X-Request-ID": request_id},
            )

    if not is_public_operational_path and api_key:
        provided_api_key = request.headers.get("x-api-key", "")
        auth_header = request.headers.get("authorization", "")
        bearer_token = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""
        if provided_api_key != api_key and bearer_token != api_key:
            metrics_service.record_request(path, 401, 0.0)
            return JSONResponse(
                status_code=401,
                content={
                    "code": "UNAUTHORIZED",
                    "message": "Invalid AI service API key",
                    "request_id": request_id,
                },
                headers={"X-Request-ID": request_id},
            )

    if not is_public_operational_path:
        limit = settings.ai_rate_limit_requests if path.startswith(("/qa", "/embed", "/document-intelligence", "/api/v1/search")) else settings.rate_limit_requests
        allowed, retry_after = rate_limiter.check(
            f"{client_ip}:{path}",
            limit=limit,
            window_seconds=settings.rate_limit_window_seconds,
        )
        if not allowed:
            metrics_service.record_request(path, 429, 0.0)
            return JSONResponse(
                status_code=429,
                content={
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests",
                    "request_id": request_id,
                    "retry_after": retry_after,
                },
                headers={"X-Request-ID": request_id, "Retry-After": str(retry_after)},
            )

    if request.method in {"POST", "PUT", "PATCH"}:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > settings.max_request_size_bytes:
                    metrics_service.record_request(path, 413, 0.0)
                    return JSONResponse(
                        status_code=413,
                        content={
                            "code": "REQUEST_TOO_LARGE",
                            "message": "Request body is too large",
                            "request_id": request_id,
                        },
                        headers={"X-Request-ID": request_id},
                    )
            except ValueError:
                pass

    try:
        response = await asyncio.wait_for(
            call_next(request),
            timeout=settings.request_timeout_seconds,
        )
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        metrics_service.record_request(path, response.status_code, duration_ms)
        logger.info(
            "Request completed request_id=%s method=%s path=%s status=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response
    except asyncio.TimeoutError:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        metrics_service.record_request(path, 504, duration_ms)
        logger.error(
            "Request timed out request_id=%s method=%s path=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        return JSONResponse(
            status_code=504,
            content={
                "code": "REQUEST_TIMEOUT",
                "message": "Request processing timed out",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        metrics_service.record_request(path, 500, duration_ms)
        logger.exception(
            "Request failed request_id=%s method=%s path=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        return JSONResponse(
            status_code=500,
            content={
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Unexpected server error",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    logger.warning(
        "HTTP error request_id=%s method=%s path=%s status=%s detail=%s",
        request_id,
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": "HTTP_ERROR",
            "message": exc.detail,
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    logger.warning(
        "Validation error request_id=%s method=%s path=%s errors=%s",
        request_id,
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "errors": exc.errors(),
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


@app.get("/api/v1/metrics")
async def metrics():
    return metrics_service.snapshot()


app.include_router(health.router)
app.include_router(search.router)
app.include_router(qa.router)
app.include_router(document_intelligence.router)
app.include_router(embed.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.port)
