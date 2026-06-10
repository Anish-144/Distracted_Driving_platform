"""
Scenario model — pre-seeded distraction scenarios used in simulation.
"""

import uuid
from sqlalchemy import String, Text, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.event import EventType


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    distraction_type: Mapped[EventType] = mapped_column(
        SAEnum(EventType, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    difficulty_level: Mapped[str] = mapped_column(
        String(20), default="medium", nullable=False,
        comment="easy | medium | hard"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    instruction_text: Mapped[str] = mapped_column(
        Text, nullable=False, comment="Text shown to user about what the agent says"
    )

    def __repr__(self) -> str:
        return f"<Scenario id={self.id} name={self.name} type={self.distraction_type}>"


# Seed data — the 3 core scenarios for Week 1
SEED_SCENARIOS = [
    {
        "id": "scenario-001",
        "name": "Incoming Phone Call",
        "description": "Your phone rings while driving. A call from an unknown number flashes on screen.",
        "distraction_type": EventType.INCOMING_CALL,
        "difficulty_level": "medium",
        "is_active": True,
        "instruction_text": "Your phone is ringing! What do you do?",
    },
    {
        "id": "scenario-002",
        "name": "WhatsApp Notification",
        "description": "A WhatsApp message notification buzzes. The preview shows an urgent message from a friend.",
        "distraction_type": EventType.WHATSAPP_NOTIFICATION,
        "difficulty_level": "easy",
        "is_active": True,
        "instruction_text": "You just got a WhatsApp message. How do you respond?",
    },
    {
        "id": "scenario-003",
        "name": "GPS Rerouting Alert",
        "description": "Your GPS app is recalculating the route and shows a new turn coming in 200 meters.",
        "distraction_type": EventType.GPS_REROUTING,
        "difficulty_level": "hard",
        "is_active": True,
        "instruction_text": "Your GPS is rerouting. Do you look at the screen while driving?",
    },
    {
        "id": "scenario-004",
        "name": "Low-Visibility Fog Hazard",
        "description": "Dense fog reduces visibility to 20 meters. Your GPS is beeping with a reroute alert while you strain to see the road.",
        "distraction_type": EventType.GPS_REROUTING,
        "difficulty_level": "hard",
        "is_active": True,
        "instruction_text": "Visibility is near zero. Your GPS is rerouting. Do you look at the screen?",
    },
    {
        "id": "scenario-005",
        "name": "Animal Crossing Hazard",
        "description": "A deer runs across the highway. At the same moment, your phone buzzes with an urgent notification.",
        "distraction_type": EventType.WHATSAPP_NOTIFICATION,
        "difficulty_level": "hard",
        "is_active": True,
        "instruction_text": "There's an animal on the road and your phone just buzzed. What do you do?",
    },
    {
        "id": "scenario-006",
        "name": "Backseat Passenger Argument",
        "description": "Two passengers in the back are having a loud disagreement and asking you to mediate while you're on a busy highway.",
        "distraction_type": EventType.INCOMING_CALL,
        "difficulty_level": "medium",
        "is_active": True,
        "instruction_text": "Your passengers are fighting and demanding your attention. Do you engage?",
    },
    {
        "id": "scenario-007",
        "name": "Emergency Vehicle Approaching",
        "description": "You hear a siren behind you. Your phone rings at the same time — it's your boss.",
        "distraction_type": EventType.INCOMING_CALL,
        "difficulty_level": "hard",
        "is_active": True,
        "instruction_text": "Siren behind you + phone ringing. What takes priority?",
    },
    {
        "id": "scenario-008",
        "name": "Social Media Notification Storm",
        "description": "You posted something viral. 5 rapid-fire notifications buzz in 10 seconds during stop-and-go traffic.",
        "distraction_type": EventType.WHATSAPP_NOTIFICATION,
        "difficulty_level": "medium",
        "is_active": True,
        "instruction_text": "Your phone is going crazy with notifications. Do you check it?",
    },
]
