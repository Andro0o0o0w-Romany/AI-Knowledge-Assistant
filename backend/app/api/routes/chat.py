"""Chat and Q&A API routes."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.chat import AskRequest, AskResponse, ChatHistoryResponse, ChatHistoryItem
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ask a question and get an AI-generated answer based on uploaded documents.
    
    The system will:
    1. Search for relevant document chunks
    2. Use the context to generate an answer
    3. Return the answer with source references
    """
    try:
        # Get answer from LLM service
        result = await llm_service.answer_question(
            question=request.question,
            user_id=current_user.id,
            n_sources=5,
        )
        
        # Save to chat history
        chat_message = ChatMessage(
            question=request.question,
            answer=result["answer"],
            sources=[s.model_dump() for s in result["sources"]] if result["sources"] else None,
            processing_time=result["processing_time"],
            user_id=current_user.id,
        )
        db.add(chat_message)
        
        return AskResponse(
            answer=result["answer"],
            sources=result["sources"],
            processing_time=result["processing_time"],
            question=result["question"],
        )
        
    except Exception as e:
        logger.error(f"Failed to process question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process question: {str(e)}"
        )


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get chat history for current user.
    
    - `limit`: Number of messages to return (default: 50, max: 100)
    - `offset`: Number of messages to skip (for pagination)
    """
    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(ChatMessage).where(
            ChatMessage.user_id == current_user.id
        )
    )
    total = count_result.scalar()
    
    # Get messages
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()
    
    # Convert to response format
    history_items = []
    for msg in messages:
        sources = None
        if msg.sources:
            from app.schemas.chat import SourceDocument
            sources = [SourceDocument(**s) for s in msg.sources]
        
        history_items.append(ChatHistoryItem(
            id=msg.id,
            question=msg.question,
            answer=msg.answer,
            sources=sources,
            processing_time=msg.processing_time,
            created_at=msg.created_at,
        ))
    
    return ChatHistoryResponse(
        messages=history_items,
        total=total,
    )


@router.delete("/history")
async def clear_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all chat history for current user."""
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.user_id == current_user.id)
    )
    messages = result.scalars().all()
    
    for msg in messages:
        await db.delete(msg)
    
    return {"message": f"Cleared {len(messages)} messages from chat history"}


@router.delete("/history/{message_id}")
async def delete_chat_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a specific chat message."""
    result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.id == message_id,
            ChatMessage.user_id == current_user.id
        )
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    await db.delete(message)
    
    return {"message": "Chat message deleted successfully"}

