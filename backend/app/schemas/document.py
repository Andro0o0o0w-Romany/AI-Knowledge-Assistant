"""Document-related Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    """Schema for document response."""
    id: int
    filename: str
    file_type: str
    file_size: int
    status: str
    chunk_count: int
    embedding_count: int
    content_preview: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Schema for list of documents response."""
    documents: List[DocumentResponse]
    total: int
    total_chunks: int
    total_embeddings: int


class UploadResponse(BaseModel):
    """Schema for upload response."""
    message: str
    documents: List[DocumentResponse]
    total_uploaded: int
    successful: int
    failed: int

