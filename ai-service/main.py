from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from app.routes import health, search
from app.config.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="Academic Platform AI Service",
    description="Semantic search and embeddings service",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database connection and load model
@app.on_event("startup")
async def startup_event():
    logger.info("Starting AI Service...")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
    
    try:
        from app.services.embedding import embedding_service
        embedding_service.load_model()
        logger.info("Embedding model loaded successfully")
    except Exception as e:
        logger.error(f"Model loading error: {e}")
    
    logger.info("AI Service startup complete")

# Include routes
app.include_router(health.router)
app.include_router(search.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
