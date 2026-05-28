from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    # Notifications
    lesson_reminders: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    weekly_progress: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    coaching_recommendations: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    assessment_reminders: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    # Training Preferences
    difficulty: Mapped[str] = mapped_column(String(50), default="Adaptive", server_default="'Adaptive'", nullable=False)
    intensity: Mapped[str] = mapped_column(String(50), default="Standard", server_default="'Standard'", nullable=False)
    audio_guidance: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    # Contact
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    emergency_contact: Mapped[str] = mapped_column(String(20), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="settings", uselist=False)
