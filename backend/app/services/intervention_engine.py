"""
Dynamic Intervention Strategy Engine.

Evolves the platform from "reacting to behavior" to "learning what works."
1. Records every intervention (passenger pressure or instructor/authority feedback).
2. Evaluates the *effectiveness* of that intervention on the VERY NEXT event.
3. Dynamically selects the next intervention strategy based on historical effectiveness for this specific user.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, update

from app.models.intervention_log import InterventionLog
from app.models.behavioral_state import BehavioralState

logger = logging.getLogger(__name__)


class InterventionEngine:

    async def record_intervention(
        self,
        db: AsyncSession,
        user_id: str,
        session_id: str,
        event_id: str,
        agent_type: str,
        intervention_phase: str,
        strategy_used: str,
        dialogue_text: str,
        prior_consecutive_mistakes: int,
        prior_reaction_time: Optional[float] = None,
    ) -> str:
        """Log an intervention BEFORE its outcome is known."""
        log_id = str(uuid.uuid4())
        new_log = InterventionLog(
            id=log_id,
            user_id=user_id,
            session_id=session_id,
            trigger_event_id=event_id,
            agent_type=agent_type,
            intervention_phase=intervention_phase,
            strategy_used=strategy_used,
            dialogue_text=dialogue_text,
            prior_consecutive_mistakes=prior_consecutive_mistakes,
            prior_reaction_time=prior_reaction_time,
        )
        db.add(new_log)
        await db.commit()
        return log_id

    async def resolve_pending_interventions(
        self,
        db: AsyncSession,
        user_id: str,
        session_id: str,
        next_event_id: str,
        decision_type: str,
        reaction_time: float,
    ) -> None:
        """
        Called when an event concludes. Finds any pending interventions from the 
        PREVIOUS event(s) in this session and scores their effectiveness.
        """
        stmt = select(InterventionLog).where(
            InterventionLog.user_id == user_id,
            InterventionLog.session_id == session_id,
            InterventionLog.resolved_at == None
        )
        result = await db.execute(stmt)
        pending_logs = result.scalars().all()

        if not pending_logs:
            return

        is_safe = decision_type in ("safe_ignore", "acceptable")
        is_impulsive = decision_type == "impulsive_unsafe"
        is_hesitant = decision_type == "delayed_hesitant"

        for log in pending_logs:
            score = 0.0

            # Was the prior state bad?
            was_unsafe_streak = log.prior_consecutive_mistakes > 0

            if was_unsafe_streak:
                if is_safe:
                    # Intervention successfully broke the bad streak! High effectiveness.
                    score = 1.0
                else:
                    # Intervention failed to stop the streak.
                    score = -1.0
            else:
                # Prior state was safe or neutral
                if is_safe:
                    # Maintained safety. Moderate positive.
                    score = 0.5
                    # Bonus if they got faster while staying safe
                    if log.prior_reaction_time and reaction_time < log.prior_reaction_time:
                        score += 0.2
                else:
                    # Broke a safe streak. Intervention may have caused overload/distraction.
                    score = -0.8
            
            # Penalize if the intervention caused severe hesitation
            if is_hesitant:
                score -= 0.5
            
            # Clamp between -1.0 and 1.0
            score = max(-1.0, min(1.0, score))

            log.next_event_id = next_event_id
            log.resulting_decision = decision_type
            log.resulting_reaction_time = reaction_time
            log.effectiveness_score = score
            log.resolved_at = datetime.utcnow()

        await db.commit()

    async def select_optimal_strategy(
        self,
        db: AsyncSession,
        user_id: str,
        intervention_phase: str,
        consecutive_mistakes: int,
        default_agent: str,
        default_strategy: str,
    ) -> Tuple[str, str]:
        """
        Queries historical effectiveness to decide the best agent and strategy.
        If data is sparse, falls back to defaults.
        """
        # If user is in a critical fail state (3+ mistakes), hard override to Authority
        if consecutive_mistakes >= 3:
            return "authority", "severe_consequence"

        # Find what worked best for this phase in the past
        stmt = select(InterventionLog.agent_type, InterventionLog.strategy_used, InterventionLog.effectiveness_score)\
            .where(
                InterventionLog.user_id == user_id,
                InterventionLog.intervention_phase == intervention_phase,
                InterventionLog.effectiveness_score != None
            )\
            .order_by(desc(InterventionLog.created_at))\
            .limit(20)
        
        result = await db.execute(stmt)
        history = result.fetchall()

        if not history:
            return default_agent, default_strategy

        # Aggregate scores by (agent, strategy)
        strategy_scores = {}
        for agent, strategy, score in history:
            key = (agent, strategy)
            if key not in strategy_scores:
                strategy_scores[key] = []
            strategy_scores[key].append(score)

        # Calculate averages and find the best
        best_key = None
        best_avg = -2.0

        for key, scores in strategy_scores.items():
            avg = sum(scores) / len(scores)
            if avg > best_avg:
                best_avg = avg
                best_key = key

        # If even the best historical strategy is negative, we might have intervention fatigue.
        # Fallback to silence or a neutral baseline if it's really bad.
        if best_avg < -0.5 and intervention_phase == "post_decision":
            return "instructor", "calm_reset"

        if best_key and best_avg > 0:
            return best_key[0], best_key[1]

        return default_agent, default_strategy


intervention_engine = InterventionEngine()
