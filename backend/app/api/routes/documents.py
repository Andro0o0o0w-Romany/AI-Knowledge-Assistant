"""Document management API routes."""
import logging
from datetime import datetime
from typing import List
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.schemas.document import DocumentResponse, DocumentListResponse, UploadResponse
from app.services.document_processor import document_processor
from app.services.vector_store import vector_store_service
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


async def process_document_background(
    document_id: int,
    file_path: str,
    file_type: str,
    user_id: int,
    document_name: str,
):
    """Background task to process document and create embeddings."""
    from app.core.database import async_session_maker
    
    async with async_session_maker() as db:
        try:
            # Get document
            result = await db.execute(select(Document).where(Document.id == document_id))
            document = result.scalar_one_or_none()
            
            if not document:
                logger.error(f"Document {document_id} not found")
                return
            
            # Update status to processing
            document.status = DocumentStatus.PROCESSING
            await db.commit()
            
            # Extract text
            text = await document_processor.extract_text(file_path, file_type)
            
            if not text.strip():
                document.status = DocumentStatus.FAILED
                document.error_message = "No text content could be extracted from the file"
                await db.commit()
                return
            
            # Split into chunks
            chunks = document_processor.split_text(text)
            
            if not chunks:
                document.status = DocumentStatus.FAILED
                document.error_message = "Failed to split document into chunks"
                await db.commit()
                return
            
            # Create embeddings
            embedding_count = await vector_store_service.add_documents(
                chunks=chunks,
                document_id=document_id,
                document_name=document_name,
                user_id=user_id,
            )
            
            # Update document with processing results
            document.status = DocumentStatus.COMPLETED
            document.chunk_count = len(chunks)
            document.embedding_count = embedding_count
            document.content_preview = document_processor.get_content_preview(text)
            document.processed_at = datetime.utcnow()
            
            await db.commit()
            logger.info(f"Successfully processed document {document_id}: {len(chunks)} chunks, {embedding_count} embeddings")
            
        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {str(e)}")
            try:
                result = await db.execute(select(Document).where(Document.id == document_id))
                document = result.scalar_one_or_none()
                if document:
                    document.status = DocumentStatus.FAILED
                    document.error_message = str(e)
                    await db.commit()
            except Exception:
                pass


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload one or more documents for processing.
    
    - Accepts .txt and .pdf files
    - Maximum file size: 10MB per file
    - Files are processed asynchronously
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )
    
    uploaded_documents = []
    successful = 0
    failed = 0
    
    for file in files:
        try:
            # Read file content
            content = await file.read()
            
            # Validate file
            file_ext = Path(file.filename).suffix.lower()
            is_valid, error_msg = document_processor.validate_file(
                file.filename, len(content)
            )
            
            if not is_valid:
                logger.warning(f"File validation failed for {file.filename}: {error_msg}")
                failed += 1
                continue
            
            # Save file
            unique_filename, file_path = await document_processor.save_file(
                content, file.filename
            )
            
            # Create document record
            document = Document(
                filename=unique_filename,
                original_filename=file.filename,
                file_path=file_path,
                file_type=file_ext,
                file_size=len(content),
                status=DocumentStatus.PENDING,
                user_id=current_user.id,
            )
            db.add(document)
            await db.flush()
            await db.refresh(document)
            
            # Schedule background processing
            background_tasks.add_task(
                process_document_background,
                document.id,
                file_path,
                file_ext,
                current_user.id,
                file.filename,
            )
            
            uploaded_documents.append(DocumentResponse.model_validate(document))
            successful += 1
            
        except Exception as e:
            logger.error(f"Failed to upload {file.filename}: {str(e)}")
            failed += 1
    
    return UploadResponse(
        message=f"Upload completed: {successful} successful, {failed} failed",
        documents=uploaded_documents,
        total_uploaded=len(files),
        successful=successful,
        failed=failed,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of all uploaded documents for current user.
    
    Returns document metadata including:
    - File information (name, type, size)
    - Processing status
    - Chunk and embedding counts
    """
    # Get documents
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    
    # Calculate totals
    total_chunks = sum(doc.chunk_count for doc in documents)
    total_embeddings = sum(doc.embedding_count for doc in documents)
    
    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(doc) for doc in documents],
        total=len(documents),
        total_chunks=total_chunks,
        total_embeddings=total_embeddings,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific document by ID."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return DocumentResponse.model_validate(document)


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document and its embeddings."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete from vector store
    await vector_store_service.delete_document(document_id)
    
    # Delete file from disk
    await document_processor.delete_file(document.file_path)
    
    # Delete from database
    await db.delete(document)
    
    return {"message": f"Document '{document.original_filename}' deleted successfully"}


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reprocess a document (useful if processing failed)."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete existing embeddings
    await vector_store_service.delete_document(document_id)
    
    # Reset document status
    document.status = DocumentStatus.PENDING
    document.chunk_count = 0
    document.embedding_count = 0
    document.error_message = None
    document.processed_at = None
    
    # Schedule background processing
    background_tasks.add_task(
        process_document_background,
        document.id,
        document.file_path,
        document.file_type,
        current_user.id,
        document.original_filename,
    )
    
    return {"message": f"Document '{document.original_filename}' queued for reprocessing"}

