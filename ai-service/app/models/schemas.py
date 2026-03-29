from pydantic import BaseModel
from typing import List, Optional, Dict

class EmbeddingRequest(BaseModel):
    text: str
    
class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimension: int
    model: str

class SearchQuery(BaseModel):
    query: str
    limit: int = 10
    offset: int = 0
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
