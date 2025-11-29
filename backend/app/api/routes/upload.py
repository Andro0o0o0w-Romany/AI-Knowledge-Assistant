"""Upload endpoint alias - redirects to documents upload for convenience."""
from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.api.routes.documents import upload_documents, UploadResponse

router = APIRouter()


@router.post("", response_model=UploadResponse)
async def upload(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload endpoint alias.
    
    This is an alias for POST /api/docs/upload for convenience.
    """
    return await upload_documents(
        background_tasks=background_tasks,
        files=files,
        db=db,
        current_user=current_user,
    )

