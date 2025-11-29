"""Vector store service using ChromaDB for document embeddings."""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

# Disable ChromaDB telemetry before import
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "False"

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document as LangChainDocument

from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing document embeddings with ChromaDB."""
    
    def __init__(self):
        """Initialize vector store service."""
        self._client = None
        self._collection = None
        self._embeddings = None
        self._initialized = False
    
    def _ensure_initialized(self):
        """Ensure vector store is initialized."""
        if self._initialized:
            return
        
        # Ensure vector store directory exists
        os.makedirs(settings.VECTOR_STORE_PATH, exist_ok=True)
        
        # Initialize ChromaDB client with persistent storage
        self._client = chromadb.PersistentClient(
            path=settings.VECTOR_STORE_PATH,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True,
            )
        )
        
        # Get or create collection
        self._collection = self._client.get_or_create_collection(
            name="knowledge_base",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Initialize OpenAI embeddings (will use mock if no API key)
        if settings.OPENAI_API_KEY:
            self._embeddings = OpenAIEmbeddings(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_EMBEDDING_MODEL,
            )
        else:
            self._embeddings = None
            logger.warning("OpenAI API key not set. Using mock embeddings.")
        
        self._initialized = True
        logger.info("Vector store initialized successfully")
    
    def _get_mock_embedding(self, text: str) -> List[float]:
        """Generate a mock embedding for testing without OpenAI API."""
        import hashlib
        # Create a deterministic embedding based on text hash
        hash_bytes = hashlib.sha256(text.encode()).digest()
        # Convert to 1536-dimensional vector (OpenAI embedding dimension)
        embedding = []
        for i in range(1536):
            byte_idx = i % len(hash_bytes)
            # Normalize to [-1, 1] range
            embedding.append((hash_bytes[byte_idx] / 255.0) * 2 - 1)
        return embedding
    
    async def add_documents(
        self,
        chunks: List[str],
        document_id: int,
        document_name: str,
        user_id: int,
    ) -> int:
        """
        Add document chunks to vector store.
        
        Args:
            chunks: List of text chunks
            document_id: Database document ID
            document_name: Original filename
            user_id: Owner user ID
            
        Returns:
            Number of embeddings created
        """
        self._ensure_initialized()
        
        if not chunks:
            return 0
        
        try:
            # Generate embeddings
            if self._embeddings:
                embeddings = self._embeddings.embed_documents(chunks)
            else:
                embeddings = [self._get_mock_embedding(chunk) for chunk in chunks]
            
            # Prepare documents for ChromaDB
            ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "document_id": document_id,
                    "document_name": document_name,
                    "user_id": user_id,
                    "chunk_index": i,
                    "created_at": datetime.utcnow().isoformat(),
                }
                for i in range(len(chunks))
            ]
            
            # Add to collection
            self._collection.add(
                ids=ids,
                documents=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            
            logger.info(f"Added {len(chunks)} chunks for document {document_id}")
            return len(chunks)
            
        except Exception as e:
            logger.error(f"Failed to add documents to vector store: {str(e)}")
            raise
    
    async def search(
        self,
        query: str,
        user_id: int,
        n_results: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant document chunks.
        
        Args:
            query: Search query
            user_id: User ID to filter results
            n_results: Number of results to return
            
        Returns:
            List of matching documents with scores
        """
        self._ensure_initialized()
        
        try:
            # Generate query embedding
            if self._embeddings:
                query_embedding = self._embeddings.embed_query(query)
            else:
                query_embedding = self._get_mock_embedding(query)
            
            # Get total count to avoid requesting more results than available
            total_count = self._collection.count()
            actual_n_results = min(n_results, total_count) if total_count > 0 else 1
            
            # Search with user filter
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=actual_n_results,
                where={"user_id": user_id},
                include=["documents", "metadatas", "distances"],
            )
            
            # Format results
            formatted_results = []
            if results and results['ids'] and results['ids'][0]:
                for i, doc_id in enumerate(results['ids'][0]):
                    # Convert distance to similarity score (cosine distance)
                    distance = results['distances'][0][i] if results['distances'] else 0
                    similarity = 1 - distance  # Convert to similarity
                    
                    formatted_results.append({
                        "id": doc_id,
                        "content": results['documents'][0][i] if results['documents'] else "",
                        "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                        "relevance_score": round(similarity, 4),
                    })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Vector search failed: {str(e)}")
            return []
    
    async def delete_document(self, document_id: int) -> bool:
        """
        Delete all chunks for a document from vector store.
        
        Args:
            document_id: Document ID to delete
            
        Returns:
            True if successful
        """
        self._ensure_initialized()
        
        try:
            # Get all chunk IDs for this document
            results = self._collection.get(
                where={"document_id": document_id},
                include=["metadatas"],
            )
            
            if results and results['ids']:
                self._collection.delete(ids=results['ids'])
                logger.info(f"Deleted {len(results['ids'])} chunks for document {document_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete document from vector store: {str(e)}")
            return False
    
    async def get_document_count(self, user_id: int) -> int:
        """Get total number of document chunks for a user."""
        self._ensure_initialized()
        
        try:
            results = self._collection.get(
                where={"user_id": user_id},
                include=[],
            )
            return len(results['ids']) if results and results['ids'] else 0
        except Exception:
            return 0
    
    async def get_total_count(self) -> int:
        """Get total number of document chunks in the store."""
        self._ensure_initialized()
        
        try:
            return self._collection.count()
        except Exception:
            return 0
    
    async def reset(self):
        """Reset the vector store (delete all data)."""
        self._ensure_initialized()
        
        try:
            self._client.delete_collection("knowledge_base")
            self._collection = self._client.create_collection(
                name="knowledge_base",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("Vector store reset successfully")
        except Exception as e:
            logger.error(f"Failed to reset vector store: {str(e)}")
            raise


# Singleton instance
vector_store_service = VectorStoreService()

