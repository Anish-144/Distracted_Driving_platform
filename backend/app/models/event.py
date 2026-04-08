"""
Event model — records each distraction event and user's response within a session.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Float, ForeignKey, Text, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class EventType(str, enum.Enum):
    INCOMING_CALL = "incoming_call"
    WHATSAPP_NOTIFICATION = "whatsapp_notification"
    GPS_REROUTING = "gps_rerouting"
    EMAIL_ALERT = "email_alert"
    SOCIAL_MEDIA = "social_media"


class UserResponseType(str, enum.Enum):
    IGNORED = "ignored"          # Safe — ignored the distraction
    INTERACTED = "interacted"    # Unsafe — picked up / responded
    VOICE_COMMAND = "voice_command"  # Used voice (safe)
    NO_RESPONSE = "no_response"  # Timed out


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[EventType] = mapped_column(SAEnum(EventType), nullable=False)
    user_response: Mapped[UserResponseType | None] = mapped_column(
        SAEnum(UserResponseType), nullable=True
    )
    response_time: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="Reaction time in seconds"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="events")

    def __repr__(self) -> str:
        return f"<Event id={self.id} type={self.event_type} response={self.user_response}>"
