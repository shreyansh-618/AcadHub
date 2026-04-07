import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config.settings import settings
from app.services.runtime_state import runtime_state
from app.utils.resilience import retry_async
import logging

logger = logging.getLogger(__name__)

db_client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

async def init_db():
    global db_client, db
    runtime_state.set_db_status("connecting")

    async def connect_once():
        global db_client, db
        if db_client:
            db_client.close()
        db_client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=2000,
        )
        try:
            db = db_client.get_default_database()
        except Exception:
            db = db_client.test
        await db_client.admin.command("ping")
        return db

    try:
        await asyncio.wait_for(
            retry_async(
                connect_once,
                retries=settings.db_connect_retries,
                base_delay_seconds=settings.db_connect_retry_base_delay_seconds,
                operation_name="MongoDB connection",
            ),
            timeout=settings.db_connect_timeout_seconds,
        )
        logger.info("Connected to MongoDB")
        runtime_state.set_db_status("connected")
    except Exception as e:
        logger.warning(f"Failed to initialize MongoDB connection after retries: {e}. Starting API anyway.")
        runtime_state.set_db_status("failed", str(e))

async def close_db():
    global db_client
    if db_client:
        db_client.close()
    runtime_state.set_db_status("disconnected")

def get_db():
    return db
