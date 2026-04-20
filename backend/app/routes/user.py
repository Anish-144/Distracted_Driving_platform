from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, ProfileType
from app.services import user_service
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])

class UpdateProfileRequest(BaseModel):
    profile_type: ProfileType

@router.patch("/me/profile")
async def update_my_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the current user's behavioral profile type.
    """
    updated_user = await user_service.update_user_profile(
        db, current_user.id, request.profile_type
    )
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Commit is handled by get_db if it finishes successfully, 
    # but we should explicitly commit if we want it saved now.
    # Actually get_db does: yield session; await session.commit()
    
    return {
        "status": "success",
        "profile_type": updated_user.profile_type.value
    }
