"""Models package — import all models here so Base.metadata knows about them."""

from app.models.user import User  # noqa: F401
from app.models.user_settings import UserSettings  # noqa: F401
from app.models.session import Session  # noqa: F401
from app.models.event import Event  # noqa: F401
from app.models.behavioral_log import BehavioralLog  # noqa: F401
from app.models.scenario import Scenario  # noqa: F401
from app.models.lesson import Lesson  # noqa: F401
from app.models.personality_profile import PersonalityProfile  # noqa: F401
from app.models.generated_scenario import GeneratedScenario  # noqa: F401
from app.models.cognitive_report import CognitiveReport  # noqa: F401
from app.models.calibration_event import CalibrationEvent  # noqa: F401
from app.models.behavioral_state import BehavioralState  # noqa: F401
from app.models.intervention_log import InterventionLog  # noqa: F401
from app.models.user_lesson import UserLesson  # noqa: F401
from app.models.feedback import Feedback, FeedbackAttachment, FeedbackNote, AIFeedbackInsightsCache  # noqa: F401

__all__ = [
    "User", "UserSettings", "Session", "Event", "BehavioralLog", "Scenario", "Lesson",
    "PersonalityProfile", "GeneratedScenario", "CognitiveReport", "CalibrationEvent",
    "BehavioralState", "InterventionLog", "UserLesson",
    "Feedback", "FeedbackAttachment", "FeedbackNote", "AIFeedbackInsightsCache"
]


