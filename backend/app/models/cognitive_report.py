"""
CognitiveReport — DB model for Behavioral Cognitive Reports.

One record per simulation session. Stores the full multi-stage analysis
produced by the Behavioral Cognitive Report Engine after session completion.

Fields map 1:1 to the 10-section report structure.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CognitiveReport(Base):
    __tablename__ = "cognitive_reports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # ── Section 1: Executive Summary ──────────────────────────────────────────
    executive_summary: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="High-level behavioral interpretation paragraph",
    )

    # ── Section 2: Cognitive Analysis ────────────────────────────────────────
    cognitive_analysis: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="How the driver thinks under pressure — mechanistic interpretation",
    )

    # ── Section 3: Emotional Trigger Breakdown ───────────────────────────────
    emotional_trigger_breakdown: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="JSON: {trigger_type, susceptibility_pct, explanation}[]",
    )

    # ── Section 4: Behavioral Timeline ───────────────────────────────────────
    behavioral_timeline: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="JSON: [{event_num, scenario_type, decision, reaction_time, cognitive_state, interpretation}]",
    )

    # ── Section 5: Attention Stability Analysis ───────────────────────────────
    attention_stability_analysis: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Focus degradation pattern narrative + structured metrics",
    )

    # ── Section 6: Risk Projection ────────────────────────────────────────────
    risk_projection: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Future behavioral risk prediction paragraph",
    )

    # ── Section 7: Behavioral Consistency Analysis ────────────────────────────
    consistency_analysis: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Self-reported profile vs actual simulation behavior comparison",
    )

    # ── Section 8: Intervention Strategy ─────────────────────────────────────
    intervention_strategy: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="JSON: [{technique, rationale, priority}] — personalized intervention plan",
    )

    # ── Section 9: Adaptive Coaching Narrative ────────────────────────────────
    coaching_narrative: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Human-like psychological coaching voice — 3-4 paragraphs",
    )

    # ── Section 10: Recommended Future Simulations ───────────────────────────
    recommended_simulations: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="JSON: [{type, difficulty, rationale, targets_weakness}]",
    )

    # ── Computed Metrics (for visualization) ──────────────────────────────────
    urgency_susceptibility_index: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.5,
        comment="0.0–1.0: how strongly urgency cues drove unsafe decisions",
    )
    authority_pressure_sensitivity: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.5,
        comment="0.0–1.0: compliance rate under authority-framed pressure",
    )
    cognitive_overload_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.5,
        comment="0.0–1.0: failure rate under compound distraction load",
    )
    emotional_reactivity_index: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.5,
        comment="0.0–1.0: emotional decision influence rate",
    )
    defensive_attention_stability: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.5,
        comment="0.0–1.0: sustained attention without degradation",
    )
    reassurance_seeking_probability: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.3,
        comment="0.0–1.0: tendency to check after ignoring a distraction",
    )

    # ── Session Context ────────────────────────────────────────────────────────
    session_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    safe_decision_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_events_in_session: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    driver_profile_at_time: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    personality_label_at_time: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")

    # ── Meta ──────────────────────────────────────────────────────────────────
    ai_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="fallback")
    generation_stage: Mapped[str] = mapped_column(
        String(20), nullable=False, default="complete",
        comment="complete | partial | fallback",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    def __repr__(self) -> str:
        return f"<CognitiveReport user={self.user_id} session={self.session_id} score={self.session_score}>"
