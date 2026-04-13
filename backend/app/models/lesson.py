"""
Lesson model — represents recommended training materials for users based on their behavior.
"""

import uuid
from sqlalchemy import String, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class LessonTag(str, enum.Enum):
    IMPULSIVE = "IMPULSIVE"
    DISTRACTED = "DISTRACTED"
    SAFE = "SAFE"
    GENERAL = "GENERAL"


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False) # e.g., Beginner, Intermediate
    tag: Mapped[LessonTag] = mapped_column(SAEnum(LessonTag), nullable=False, default=LessonTag.GENERAL)

    def __repr__(self) -> str:
        return f"<Lesson id={self.id} title={self.title} tag={self.tag}>"
