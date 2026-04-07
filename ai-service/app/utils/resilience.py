import asyncio
import logging
from typing import Awaitable, Callable, TypeVar

T = TypeVar("T")

logger = logging.getLogger(__name__)


async def retry_async(
    operation: Callable[[], Awaitable[T]],
    *,
    retries: int,
    base_delay_seconds: float,
    operation_name: str,
) -> T:
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            return await operation()
        except Exception as exc:
            last_error = exc
            if attempt == retries:
                break
            delay = base_delay_seconds * (2 ** (attempt - 1))
            logger.warning(
                "%s failed on attempt %s/%s. Retrying in %.2fs. Error: %s",
                operation_name,
                attempt,
                retries,
                delay,
                exc,
            )
            await asyncio.sleep(delay)

    raise last_error
