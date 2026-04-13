"""
Lessons routes — fetch recommended lessons based on driver profile.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, ProfileType
from app.models.lesson import Lesson, LessonTag
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/lessons", tags=["Lessons"])


class LessonResponse(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    tag: str


@router.get("/recommended", response_model=List[LessonResponse])
async def get_recommended_lessons(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch recommended lessons based on the user's profile type.
    """
    # Map ProfileType to LessonTag
    tag_filter = LessonTag.GENERAL
    if current_user.profile_type == ProfileType.IMPULSIVE:
        tag_filter = LessonTag.IMPULSIVE
    elif current_user.profile_type == ProfileType.DISTRACTIBLE:
        tag_filter = LessonTag.DISTRACTED
    elif current_user.profile_type == ProfileType.RULE_FOLLOWING:
        tag_filter = LessonTag.SAFE

    # Always fetch GENERAL lessons plus specific ones if applicable
    stmt = select(Lesson).where(Lesson.tag.in_([tag_filter, LessonTag.GENERAL]))
    result = await db.execute(stmt)
    lessons = result.scalars().all()
    
    # Sort or limit if necessary (e.g. prioritize matching tag over GENERAL)
    sorted_lessons = sorted(lessons, key=lambda l: 0 if l.tag == tag_filter else 1)

    return [
        LessonResponse(
            id=l.id,
            title=l.title,
            description=l.description,
            difficulty=l.difficulty,
            tag=l.tag.value
        )
        for l in sorted_lessons
    ]

@router.get("", response_model=List[LessonResponse])
async def get_all_lessons(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch all lessons."""
    result = await db.execute(select(Lesson))
    lessons = result.scalars().all()
    return [
        LessonResponse(
            id=l.id,
            title=l.title,
            description=l.description,
            difficulty=l.difficulty,
            tag=l.tag.value
        )
        for l in lessons
    ]
