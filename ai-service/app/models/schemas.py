from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    
class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimension: int
    model: str

class SearchQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(default=10, ge=1, le=25)
    offset: int = Field(default=0, ge=0, le=1000)
    filters: Optional[Dict] = None

class SearchResult(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    score: float
    resource_type: str
    category: str
    department: str
    subject: str
    semester: Optional[int] = None
    created_at: Optional[str] = None
    snippet: Optional[str] = None
    page_number: Optional[int] = None
    source_count: Optional[int] = None

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    page: int
    limit: int
    query: str
    processing_time: float

class HealthResponse(BaseModel):
    status: str
    model: str
    version: str
    ready: bool
    database_status: str
    model_status: str
    model_dimension: Optional[int] = None
    model_loaded_at: Optional[str] = None
    uptime_seconds: int
