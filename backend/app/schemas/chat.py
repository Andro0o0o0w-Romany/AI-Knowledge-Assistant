"""Chat-related Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class SourceDocument(BaseModel):
    """Schema for source document in response."""
    content: str
    document_name: str
    chunk_index: int
    relevance_score: float


class AskRequest(BaseModel):
    """Schema for ask question request."""
    question: str = Field(..., min_length=1, max_length=2000)


class AskResponse(BaseModel):
    """Schema for ask question response."""
    answer: str
    sources: List[SourceDocument]
    processing_time: float
    question: str


class ChatHistoryItem(BaseModel):
    """Schema for single chat history item."""
    id: int
    question: str
    answer: str
    sources: Optional[List[SourceDocument]] = None
    processing_time: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """Schema for chat history response."""
    messages: List[ChatHistoryItem]
    total: int

