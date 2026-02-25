import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

db_client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

async def init_db():
    global db_client, db
    try:
        db_client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=2000)
        # Use 'test' database to match backend (which defaults to 'test' when no DB specified in URI)
        # or use the database from URI if present
        try:
            db = db_client.get_default_database()
        except Exception:
            db = db_client.test
        # Try to verify connection but don't fail if unavailable
        try:
            await db_client.admin.command('ping')
            logger.info("Connected to MongoDB")
        except Exception as ping_error:
            logger.warning(f"MongoDB connection ping failed: {ping_error}. Starting API anyway.")
    except Exception as e:
        logger.warning(f"Failed to initialize MongoDB connection: {e}. Starting API anyway.")

async def close_db():
    global db_client
    if db_client:
        db_client.close()

def get_db():
    return db
