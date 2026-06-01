"""
Feedback models for Beta Testing & Feedback Management System.
"""

import uuid
from datetime import datetime
import enum
from typing import Optional, List

from sqlalchemy import String, DateTime, func, Enum as SAEnum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class FeedbackType(str, enum.Enum):
    BUG = "bug"
    FEATURE = "feature"
    UX = "ux"
    GENERAL = "general"
    SIMULATION = "simulation"

class FeedbackStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    ARCHIVED = "archived"

class FeedbackPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    type: Mapped[FeedbackType] = mapped_column(
        SAEnum(FeedbackType, values_callable=lambda x: [e.value for e in x]),
        default=FeedbackType.GENERAL,
        nullable=False,
    )
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # 1-5 rating
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    
    status: Mapped[FeedbackStatus] = mapped_column(
        SAEnum(FeedbackStatus, values_callable=lambda x: [e.value for e in x]),
        default=FeedbackStatus.OPEN,
        nullable=False,
    )
    priority: Mapped[FeedbackPriority] = mapped_column(
        SAEnum(FeedbackPriority, values_callable=lambda x: [e.value for e in x]),
        default=FeedbackPriority.MEDIUM,
        nullable=False,
    )
    
    # Auto-collected metadata
    page_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    screen_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    app_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    session_id: Mapped[Optional[str]] = mapped_column(ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    attachments: Mapped[List["FeedbackAttachment"]] = relationship("FeedbackAttachment", back_populates="feedback", cascade="all, delete-orphan", lazy="selectin")
    notes: Mapped[List["FeedbackNote"]] = relationship("FeedbackNote", back_populates="feedback", cascade="all, delete-orphan", lazy="selectin")


class FeedbackAttachment(Base):
    __tablename__ = "feedback_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    feedback_id: Mapped[str] = mapped_column(ForeignKey("feedbacks.id", ondelete="CASCADE"), nullable=False)
    
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "image/png", "video/webm"
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    feedback: Mapped["Feedback"] = relationship("Feedback", back_populates="attachments")


class FeedbackNote(Base):
    __tablename__ = "feedback_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    feedback_id: Mapped[str] = mapped_column(ForeignKey("feedbacks.id", ondelete="CASCADE"), nullable=False)
    admin_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    feedback: Mapped["Feedback"] = relationship("Feedback", back_populates="notes")

class AIFeedbackInsightsCache(Base):
    __tablename__ = "ai_feedback_insights_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    insights_text: Mapped[str] = mapped_column(Text, nullable=False)
    analyzed_count: Mapped[int] = mapped_column(Integer, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
