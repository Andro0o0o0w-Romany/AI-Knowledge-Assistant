"""LLM service for question answering using LangChain."""
import logging
import time
from typing import List, Dict, Any, Optional

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage

from app.core.config import settings
from app.services.vector_store import vector_store_service
from app.schemas.chat import SourceDocument

logger = logging.getLogger(__name__)


# System prompt for the AI assistant
SYSTEM_PROMPT = """You are a helpful AI knowledge assistant. Your role is to answer questions based on the provided context from uploaded documents.

IMPORTANT INSTRUCTIONS:
1. Only use information from the provided context to answer questions.
2. If the context doesn't contain relevant information, say so clearly.
3. Be concise but comprehensive in your answers.
4. When referencing information, mention which document it came from.
5. If you're uncertain about something, acknowledge the uncertainty.

CONTEXT FROM DOCUMENTS:
{context}

---

Please answer the user's question based on the above context. If the context doesn't contain relevant information, let the user know and suggest they upload more relevant documents."""


class LLMService:
    """Service for LLM-powered question answering."""
    
    def __init__(self):
        """Initialize LLM service."""
        self._llm = None
        self._initialized = False
        self._provider = None
        self._model_name = None
    
    def _ensure_initialized(self):
        """Ensure LLM is initialized."""
        if self._initialized:
            return
        
        provider = settings.LLM_PROVIDER.lower()
        
        # Try Anthropic/Claude first if selected
        if provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            self._llm = ChatAnthropic(
                anthropic_api_key=settings.ANTHROPIC_API_KEY,
                model=settings.ANTHROPIC_MODEL,
                temperature=0.7,
                max_tokens=1024,
            )
            self._provider = "anthropic"
            self._model_name = settings.ANTHROPIC_MODEL
            logger.info(f"Initialized Claude LLM with model: {settings.ANTHROPIC_MODEL}")
        
        # Fall back to OpenAI if selected or if Anthropic not configured
        elif provider == "openai" and settings.OPENAI_API_KEY:
            self._llm = ChatOpenAI(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                temperature=0.7,
                max_tokens=1000,
            )
            self._provider = "openai"
            self._model_name = settings.OPENAI_MODEL
            logger.info(f"Initialized OpenAI LLM with model: {settings.OPENAI_MODEL}")
        
        # Try any available provider if preferred one not configured
        elif settings.ANTHROPIC_API_KEY:
            self._llm = ChatAnthropic(
                anthropic_api_key=settings.ANTHROPIC_API_KEY,
                model=settings.ANTHROPIC_MODEL,
                temperature=0.7,
                max_tokens=1024,
            )
            self._provider = "anthropic"
            self._model_name = settings.ANTHROPIC_MODEL
            logger.info(f"Fallback to Claude LLM with model: {settings.ANTHROPIC_MODEL}")
        
        elif settings.OPENAI_API_KEY:
            self._llm = ChatOpenAI(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                temperature=0.7,
                max_tokens=1000,
            )
            self._provider = "openai"
            self._model_name = settings.OPENAI_MODEL
            logger.info(f"Fallback to OpenAI LLM with model: {settings.OPENAI_MODEL}")
        
        else:
            self._llm = None
            self._provider = "mock"
            self._model_name = "mock"
            logger.warning("No API key set (ANTHROPIC_API_KEY or OPENAI_API_KEY). Using mock responses.")
        
        self._initialized = True
    
    def _get_mock_response(self, question: str, context: str) -> str:
        """Generate a mock response for testing without OpenAI API."""
        if not context.strip():
            return "I don't have any relevant information in the uploaded documents to answer your question. Please upload documents that contain information related to your query."
        
        # Simple mock response that references the context
        return f"""Based on the uploaded documents, I found relevant information to answer your question.

**Summary:**
The documents contain information that may be relevant to your query about "{question[:50]}...". 

**Key Points from Documents:**
{context[:500]}...

**Note:** This is a mock response. Connect an OpenAI API key for intelligent answers based on document content."""
    
    def _format_context(self, search_results: List[Dict[str, Any]]) -> str:
        """Format search results into context string."""
        if not search_results:
            return ""
        
        context_parts = []
        for i, result in enumerate(search_results, 1):
            doc_name = result.get('metadata', {}).get('document_name', 'Unknown')
            content = result.get('content', '')
            score = result.get('relevance_score', 0)
            
            context_parts.append(
                f"[Source {i}: {doc_name} (Relevance: {score:.2%})]\n{content}"
            )
        
        return "\n\n---\n\n".join(context_parts)
    
    async def answer_question(
        self,
        question: str,
        user_id: int,
        n_sources: int = 5,
    ) -> Dict[str, Any]:
        """
        Answer a question using retrieved context.
        
        Args:
            question: User's question
            user_id: User ID for document filtering
            n_sources: Number of source documents to retrieve
            
        Returns:
            Dict with answer, sources, and processing time
        """
        self._ensure_initialized()
        start_time = time.time()
        
        try:
            # Retrieve relevant documents
            search_results = await vector_store_service.search(
                query=question,
                user_id=user_id,
                n_results=n_sources,
            )
            
            # Format context
            context = self._format_context(search_results)
            
            # Generate answer
            if self._llm:
                # Use LangChain with OpenAI
                messages = [
                    SystemMessage(content=SYSTEM_PROMPT.format(context=context)),
                    HumanMessage(content=question),
                ]
                response = self._llm.invoke(messages)
                answer = response.content
            else:
                # Use mock response
                answer = self._get_mock_response(question, context)
            
            # Format sources
            sources = []
            for result in search_results:
                metadata = result.get('metadata', {})
                sources.append(SourceDocument(
                    content=result.get('content', '')[:500],  # Limit content length
                    document_name=metadata.get('document_name', 'Unknown'),
                    chunk_index=metadata.get('chunk_index', 0),
                    relevance_score=result.get('relevance_score', 0),
                ))
            
            processing_time = time.time() - start_time
            
            return {
                "answer": answer,
                "sources": sources,
                "processing_time": round(processing_time, 3),
                "question": question,
            }
            
        except Exception as e:
            logger.error(f"Failed to answer question: {str(e)}")
            processing_time = time.time() - start_time
            
            return {
                "answer": f"I encountered an error while processing your question: {str(e)}. Please try again.",
                "sources": [],
                "processing_time": round(processing_time, 3),
                "question": question,
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if LLM service is healthy."""
        self._ensure_initialized()
        
        return {
            "llm_available": self._llm is not None,
            "provider": self._provider,
            "model": self._model_name,
            "embedding_model": settings.OPENAI_EMBEDDING_MODEL,
        }


# Singleton instance
llm_service = LLMService()

