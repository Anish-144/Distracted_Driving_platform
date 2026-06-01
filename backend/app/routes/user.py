from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, field_validator

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

class UpdateCoreProfileRequest(BaseModel):
    name: str
    email: EmailStr

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


@router.patch("/profile")
async def update_core_profile(
    request: UpdateCoreProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's name and email."""
    try:
        updated_user = await user_service.update_core_profile(
            db, current_user.id, request.name, request.email
        )
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return {
            "status": "success",
            "name": updated_user.name,
            "email": updated_user.email
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )

@router.patch("/password")
async def update_password(
    request: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's password."""
    try:
        success = await user_service.update_password(
            db, current_user.id, request.current_password, request.new_password
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return {"status": "success", "message": "Password updated successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
