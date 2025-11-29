"""Chat message database model."""
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, List, Optional

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ChatMessage(Base):
    """Chat message model for Q&A history."""
    
    __tablename__ = "chat_messages"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Message content
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Sources and metadata
    sources: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    processing_time: Mapped[Optional[float]] = mapped_column(nullable=True)  # seconds
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # User relationship
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    user: Mapped["User"] = relationship("User", back_populates="chat_messages")
    
    def __repr__(self) -> str:
        return f"<ChatMessage(id={self.id}, question={self.question[:50]}...)>"
    
    def to_dict(self) -> dict:
        """Convert chat message to dictionary."""
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "sources": self.sources,
            "processing_time": self.processing_time,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

