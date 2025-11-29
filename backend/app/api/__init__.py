"""API routes package."""
from fastapi import APIRouter
from app.api.routes import auth, documents, chat, health, upload

# Create main API router
api_router = APIRouter()

# Include route modules
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(documents.router, prefix="/docs", tags=["Documents"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(chat.router, prefix="/ask", tags=["Chat"])

