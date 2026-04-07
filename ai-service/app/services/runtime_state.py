from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RuntimeState:
    def __init__(self) -> None:
        self.started_at = utc_now()
        self.db_status = "unknown"
        self.db_error: Optional[str] = None
        self.model_status = "idle"
        self.model_error: Optional[str] = None
        self.model_name: Optional[str] = None
        self.model_dimension: Optional[int] = None
        self.model_loaded_at: Optional[datetime] = None
        self.ready = False

    def set_db_status(self, status: str, error: Optional[str] = None) -> None:
        self.db_status = status
        self.db_error = error

    def set_model_status(
        self,
        status: str,
        *,
        model_name: Optional[str] = None,
        dimension: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:
        self.model_status = status
        self.model_error = error
        if model_name is not None:
            self.model_name = model_name
        if dimension is not None:
            self.model_dimension = dimension
        if status == "ready":
            self.model_loaded_at = utc_now()

    def mark_ready(self) -> None:
        self.ready = self.db_status in {"connected", "degraded"} and self.model_status == "ready"

    def snapshot(self) -> dict:
        uptime_seconds = int((utc_now() - self.started_at).total_seconds())
        self.mark_ready()
        return {
            "ready": self.ready,
            "uptime_seconds": uptime_seconds,
            "database": {
                "status": self.db_status,
                "error": self.db_error,
            },
            "model": {
                "status": self.model_status,
                "name": self.model_name,
                "dimension": self.model_dimension,
                "loaded_at": self.model_loaded_at.isoformat() if self.model_loaded_at else None,
                "error": self.model_error,
            },
        }


runtime_state = RuntimeState()
