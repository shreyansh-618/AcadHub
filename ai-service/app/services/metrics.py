import threading


class MetricsService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self.total_requests = 0
            self.total_errors = 0
            self.total_rate_limited = 0
            self.total_latency_ms = 0.0
            self.by_path: dict[str, dict[str, float]] = {}

    def record_request(self, path: str, status_code: int, duration_ms: float) -> None:
        with self._lock:
            self.total_requests += 1
            self.total_latency_ms += duration_ms
            if status_code >= 400:
                self.total_errors += 1
            if status_code == 429:
                self.total_rate_limited += 1

            entry = self.by_path.setdefault(
                path,
                {"requests": 0, "errors": 0, "latency_ms_total": 0.0},
            )
            entry["requests"] += 1
            entry["latency_ms_total"] += duration_ms
            if status_code >= 400:
                entry["errors"] += 1

    def snapshot(self) -> dict:
        with self._lock:
            average_latency_ms = (
                self.total_latency_ms / self.total_requests
                if self.total_requests
                else 0.0
            )
            by_path = {}
            for path, entry in self.by_path.items():
                requests = int(entry["requests"])
                by_path[path] = {
                    "requests": requests,
                    "errors": int(entry["errors"]),
                    "avg_latency_ms": round(
                        entry["latency_ms_total"] / requests if requests else 0.0,
                        2,
                    ),
                }

            return {
                "requests_total": self.total_requests,
                "errors_total": self.total_errors,
                "rate_limited_total": self.total_rate_limited,
                "avg_latency_ms": round(average_latency_ms, 2),
                "by_path": by_path,
            }


metrics_service = MetricsService()
