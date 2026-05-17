"""
Behavior Analyzer Service.

Replaces the empty stub. Tracks per-user behavioral intelligence:
  - Updates BehavioralState after every event
  - Classifies driver pattern
  - Computes pressure escalation level
  - Returns behavior_summary string for LLM prompt injection
"""

import json
import logging
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.behavioral_state import BehavioralState

logger = logging.getLogger(__name__)

# Decision classification
_SAFE_DECISIONS = {"safe_ignore", "acceptable"}
_UNSAFE_DECISIONS = {"impulsive_unsafe", "risky", "delayed_hesitant"}


@dataclass
class BehavioralSummary:
    """Returned to the AI coach after every event analysis."""
    dominant_pattern: str         # impulsive | hesitant | distracted | safe | inconsistent
    behavior_summary: str         # short English string for prompt injection
    consecutive_mistakes: int
    pressure_level: int           # 0–3
    pressure_level_label: str     # low | medium | high | critical
    safe_ratio: float             # 0.0–1.0
    avg_reaction_time: float
    dominant_fail_scenario: str


_PRESSURE_LABELS = {0: "low", 1: "medium", 2: "high", 3: "critical"}


class BehaviorAnalyzer:

    # ── Public API ────────────────────────────────────────────────────────────

    async def analyze_event(
        self,
        db: AsyncSession,
        user_id: str,
        event_type: str,
        decision_type: str,
        response_time: float,
        score_delta: float,
        urgency: str = "medium",
    ) -> BehavioralSummary:
        """
        Call after every simulation event.
        1. Fetch or create BehavioralState for user
        2. Update all counters and analytics
        3. Persist
        4. Return a BehavioralSummary
        """
        state = await self._get_or_create(db, user_id)

        is_safe = decision_type in _SAFE_DECISIONS
        is_impulsive = (not is_safe) and (response_time < 2.0)
        is_hesitant = response_time > 5.0

        # ── Update counters ───────────────────────────────────────────────────
        state.total_events += 1

        if is_safe:
            state.safe_decisions += 1
            state.consecutive_mistakes = 0
        else:
            state.unsafe_decisions += 1
            state.consecutive_mistakes += 1

        if is_impulsive:
            state.impulsive_count += 1
        if is_hesitant:
            state.hesitant_count += 1

        # ── Pressure response (did urgency drive unsafe decision?) ────────────
        if urgency == "high":
            if is_safe:
                state.pressure_resist_count += 1
            else:
                state.pressure_yield_count += 1

        # ── Timing analytics (running average) ───────────────────────────────
        n = state.total_events
        state.avg_reaction_time = (
            (state.avg_reaction_time * (n - 1) + response_time) / n
        )
        state.fastest_reaction = min(state.fastest_reaction, response_time)
        state.slowest_reaction = max(state.slowest_reaction, response_time)

        # ── Scenario failure tracking ─────────────────────────────────────────
        if not is_safe:
            counts = self._parse_fail_counts(state.fail_scenario_counts)
            counts[event_type] = counts.get(event_type, 0) + 1
            state.fail_scenario_counts = self._serialize_fail_counts(counts)
            # Dominant = scenario with most failures
            state.dominant_fail_scenario = max(counts, key=counts.get)

        # ── Pressure level escalation ─────────────────────────────────────────
        state.pressure_level = min(3, state.consecutive_mistakes // 2)

        # ── Persist ───────────────────────────────────────────────────────────
        db.add(state)
        await db.flush()

        return self._build_summary(state)

    async def get_summary(
        self, db: AsyncSession, user_id: str
    ) -> BehavioralSummary:
        """Get the current behavioral summary without updating it."""
        state = await self._get_or_create(db, user_id)
        return self._build_summary(state)

    def reset_session_state(self, state: BehavioralState) -> None:
        """Call at the start of a new session to reset transient metrics."""
        state.consecutive_mistakes = 0
        state.pressure_level = 0

    # ── Internals ─────────────────────────────────────────────────────────────

    async def _get_or_create(
        self, db: AsyncSession, user_id: str
    ) -> BehavioralState:
        result = await db.execute(
            select(BehavioralState).where(BehavioralState.user_id == user_id)
        )
        state = result.scalar_one_or_none()
        if state is None:
            state = BehavioralState(user_id=user_id)
            db.add(state)
            await db.flush()
            await db.refresh(state)
        return state

    def _build_summary(self, state: BehavioralState) -> BehavioralSummary:
        pattern = self._classify_pattern(state)
        summary = self._human_summary(state, pattern)
        return BehavioralSummary(
            dominant_pattern=pattern,
            behavior_summary=summary,
            consecutive_mistakes=state.consecutive_mistakes,
            pressure_level=state.pressure_level,
            pressure_level_label=_PRESSURE_LABELS[state.pressure_level],
            safe_ratio=(
                state.safe_decisions / state.total_events
                if state.total_events > 0
                else 0.5
            ),
            avg_reaction_time=round(state.avg_reaction_time, 2),
            dominant_fail_scenario=state.dominant_fail_scenario or "none",
        )

    def _classify_pattern(self, state: BehavioralState) -> str:
        if state.total_events == 0:
            return "unknown"
        ratio = state.safe_decisions / state.total_events
        if ratio >= 0.85:
            return "safe"
        if state.impulsive_count > state.hesitant_count and state.impulsive_count >= 2:
            return "impulsive"
        if state.hesitant_count >= 2:
            return "hesitant"
        if ratio < 0.5:
            return "distracted"
        return "inconsistent"

    def _human_summary(self, state: BehavioralState, pattern: str) -> str:
        lines = []
        if state.total_events == 0:
            return "first session, no prior data"
        lines.append(f"{pattern} driver ({int(state.safe_decisions / state.total_events * 100)}% safe rate)")
        if state.consecutive_mistakes > 0:
            lines.append(f"{state.consecutive_mistakes} consecutive mistake(s)")
        if state.dominant_fail_scenario:
            lines.append(f"struggles most with {state.dominant_fail_scenario.replace('_', ' ')}")
        if state.avg_reaction_time > 4.0:
            lines.append("slow reactor overall")
        elif state.avg_reaction_time < 1.5:
            lines.append("very fast reactor (impulsive risk)")
        return "; ".join(lines)

    @staticmethod
    def _parse_fail_counts(raw: str) -> dict[str, int]:
        if not raw:
            return {}
        try:
            return {
                k: int(v)
                for part in raw.split(",")
                for k, v in [part.split(":")]
                if part
            }
        except Exception:
            return {}

    @staticmethod
    def _serialize_fail_counts(counts: dict[str, int]) -> str:
        return ",".join(f"{k}:{v}" for k, v in counts.items())


# ── Singleton ─────────────────────────────────────────────────────────────────
behavior_analyzer = BehaviorAnalyzer()
