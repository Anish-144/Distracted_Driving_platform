from pydantic import BaseModel
from typing import Optional


class UserSettingsRead(BaseModel):
    lesson_reminders: bool
    weekly_progress: bool
    coaching_recommendations: bool
    assessment_reminders: bool
    email_notifications: bool

    difficulty: str
    intensity: str
    audio_guidance: bool

    phone: Optional[str] = None
    emergency_contact: Optional[str] = None

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    lesson_reminders: Optional[bool] = None
    weekly_progress: Optional[bool] = None
    coaching_recommendations: Optional[bool] = None
    assessment_reminders: Optional[bool] = None
    email_notifications: Optional[bool] = None

    difficulty: Optional[str] = None
    intensity: Optional[str] = None
    audio_guidance: Optional[bool] = None

    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
