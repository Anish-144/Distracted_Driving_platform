from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class InterventionLog(Base):
    """
    Records a specific AI intervention and its measured behavioral outcome.
    Used by the Dynamic Strategy Engine to learn what pressure styles actually
    change driver behavior over time.
    """
    __tablename__ = "intervention_logs"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    
    # The event this intervention was attached to
    trigger_event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=True)
    
    # Intervention details
    agent_type = Column(String(50), nullable=False)  # passenger, instructor, authority, silence, cognitive_load
    intervention_phase = Column(String(50), nullable=False) # pre_decision (pressure) or post_decision (feedback)
    strategy_used = Column(String(100), nullable=False) # e.g., 'escalated_urgency', 'calm_reinforcement', 'consequence_focus'
    dialogue_text = Column(String(500), nullable=True)
    
    # Baseline state before this intervention
    prior_consecutive_mistakes = Column(Integer, default=0)
    prior_reaction_time = Column(Float, nullable=True)
    
    # The measured outcome on the VERY NEXT relevant event
    # Null until the next event resolves
    next_event_id = Column(String(36), nullable=True)
    resulting_decision = Column(String(50), nullable=True)
    resulting_reaction_time = Column(Float, nullable=True)
    
    # Calculated effectiveness score (-1.0 to 1.0)
    # +1.0 = turned unsafe behavior into safe, or maintained safe and improved speed
    # -1.0 = turned safe behavior into unsafe, or caused severe hesitation
    effectiveness_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User")
    session = relationship("Session")
