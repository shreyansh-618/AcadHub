import threading
import time


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = {}

    def check(self, key: str, *, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            hits = [timestamp for timestamp in self._hits.get(key, []) if timestamp >= cutoff]
            if len(hits) >= limit:
                retry_after = max(1, int(window_seconds - (now - hits[0])))
                self._hits[key] = hits
                return False, retry_after

            hits.append(now)
            self._hits[key] = hits
            return True, 0


rate_limiter = InMemoryRateLimiter()
