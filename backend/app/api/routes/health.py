"""Health check endpoints."""
from fastapi import APIRouter
from app.services.llm_service import llm_service
from app.services.vector_store import vector_store_service
from app.core.config import settings

router = APIRouter()


@router.get("")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with service status."""
    llm_health = await llm_service.health_check()
    vector_count = await vector_store_service.get_total_count()
    
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "services": {
            "llm": llm_health,
            "vector_store": {
                "available": True,
                "total_embeddings": vector_count,
            },
        },
        "config": {
            "chunk_size": settings.CHUNK_SIZE,
            "chunk_overlap": settings.CHUNK_OVERLAP,
            "max_file_size_mb": settings.MAX_FILE_SIZE / (1024 * 1024),
            "allowed_extensions": settings.ALLOWED_EXTENSIONS,
        }
    }

