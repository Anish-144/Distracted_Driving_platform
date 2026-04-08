"""
User service — CRUD helpers for the User model.
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, ProfileType
from app.services.auth_service import hash_password


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Fetch a user by email address."""
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    """Fetch a user by their UUID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    name: str,
    email: str,
    plain_password: str,
    profile_type: ProfileType = ProfileType.UNKNOWN,
) -> User:
    """
    Create and persist a new user.
    
    Returns:
        The newly created User ORM object.
    """
    user = User(
        name=name,
        email=email.lower().strip(),
        hashed_password=hash_password(plain_password),
        profile_type=profile_type,
    )
    db.add(user)
    await db.flush()  # Get the generated ID before commit
    await db.refresh(user)
    return user


async def update_user_profile(
    db: AsyncSession,
    user_id: str,
    profile_type: ProfileType,
) -> Optional[User]:
    """Update the behavioral profile type for a user."""
    user = await get_user_by_id(db, user_id)
    if user is None:
        return None
    user.profile_type = profile_type
    await db.flush()
    await db.refresh(user)
    return user
