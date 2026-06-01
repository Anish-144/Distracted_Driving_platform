"""
User service — CRUD helpers for the User model.
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, ProfileType
from app.services.auth_service import hash_password, verify_password


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


async def update_core_profile(
    db: AsyncSession,
    user_id: str,
    name: str,
    email: str,
) -> Optional[User]:
    """Update user's name and email. Raises ValueError if email is taken."""
    user = await get_user_by_id(db, user_id)
    if user is None:
        return None
    
    # Check for email conflict
    email = email.lower().strip()
    if email != user.email:
        conflict = await get_user_by_email(db, email)
        if conflict:
            raise ValueError("An account with this email already exists")
    
    user.name = name.strip()
    user.email = email
    await db.flush()
    await db.refresh(user)
    return user


async def update_password(
    db: AsyncSession,
    user_id: str,
    current_password: str,
    new_password: str,
) -> bool:
    """Update a user's password. Raises ValueError if current password is incorrect."""
    user = await get_user_by_id(db, user_id)
    if user is None:
        return False
    
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Incorrect current password")
        
    user.hashed_password = hash_password(new_password)
    await db.flush()
    return True
