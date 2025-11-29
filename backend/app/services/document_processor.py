"""Document processing service for text extraction and chunking."""
import os
import uuid
import aiofiles
from datetime import datetime
from typing import List, Tuple, Optional
from pathlib import Path

from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.core.config import settings


class DocumentProcessor:
    """Service for processing uploaded documents."""
    
    def __init__(self):
        """Initialize document processor with text splitter."""
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        self._ensure_upload_dir()
    
    def _ensure_upload_dir(self):
        """Ensure upload directory exists."""
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    async def save_file(self, file_content: bytes, original_filename: str) -> Tuple[str, str]:
        """
        Save uploaded file to disk.
        
        Returns:
            Tuple of (unique_filename, file_path)
        """
        # Generate unique filename
        file_ext = Path(original_filename).suffix.lower()
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # Save file asynchronously
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        return unique_filename, file_path
    
    async def extract_text(self, file_path: str, file_type: str) -> str:
        """
        Extract text content from a file.
        
        Args:
            file_path: Path to the file
            file_type: File extension (e.g., '.pdf', '.txt')
            
        Returns:
            Extracted text content
        """
        file_type = file_type.lower()
        
        if file_type == '.txt':
            return await self._extract_text_from_txt(file_path)
        elif file_type == '.pdf':
            return await self._extract_text_from_pdf(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    async def _extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from a .txt file."""
        async with aiofiles.open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = await f.read()
        return content.strip()
    
    async def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from a .pdf file."""
        try:
            reader = PdfReader(file_path)
            text_parts = []
            
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            
            return "\n\n".join(text_parts).strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    def split_text(self, text: str) -> List[str]:
        """
        Split text into chunks for embedding.
        
        Args:
            text: Full text content
            
        Returns:
            List of text chunks
        """
        if not text.strip():
            return []
        
        chunks = self.text_splitter.split_text(text)
        return chunks
    
    def get_content_preview(self, text: str, max_length: int = 500) -> str:
        """Get a preview of the text content."""
        if len(text) <= max_length:
            return text
        return text[:max_length] + "..."
    
    def validate_file(self, filename: str, file_size: int) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded file.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check file extension
        file_ext = Path(filename).suffix.lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            return False, f"File type '{file_ext}' not allowed. Allowed types: {settings.ALLOWED_EXTENSIONS}"
        
        # Check file size
        if file_size > settings.MAX_FILE_SIZE:
            max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
            return False, f"File size exceeds maximum allowed size of {max_mb}MB"
        
        return True, None
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete a file from disk."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            return True
        except Exception:
            return False


# Singleton instance
document_processor = DocumentProcessor()

