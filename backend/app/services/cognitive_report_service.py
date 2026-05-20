"""
Cognitive Report Service — Behavioral Cognitive Report Engine.
Replaces the basic lesson generation with a multi-stage behavioral reasoning pipeline.
"""

import json
import logging
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.cognitive_report import CognitiveReport
from app.models.behavioral_state import BehavioralState
from app.models.personality_profile import PersonalityProfile
from app.services.llm_provider import llm_provider
from app.services.behavior_analyzer import BehavioralSummary
from app.services.cognitive_report_prompt import COGNITIVE_REPORT_PROMPT

logger = logging.getLogger(__name__)


class CognitiveReportService:
    async def generate_report(
        self,
        db: AsyncSession,
        user_id: str,
        session_id: str,
        behavioral_summary: BehavioralSummary,
        behavioral_state: BehavioralState,
        session_events: List[Dict[str, Any]],
        session_score: float,
    ) -> CognitiveReport:
        """
        Orchestrates the multi-stage behavioral reasoning pipeline to generate
        a comprehensive CognitiveReport for a completed session.
        """
        # Fetch Personality Profile for consistency analysis
        profile_result = await db.execute(
            select(PersonalityProfile).where(PersonalityProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        personality_label = profile.onboarding_profile_label if profile else "unknown"
        self_awareness_score = profile.self_awareness_score if profile else 0.5
        consistency_score = profile.consistency_score if profile else 0.5

        # Format session events for the prompt
        events_str = ""
        for i, ev in enumerate(session_events, 1):
            events_str += f"Event {i}: {ev.get('event_type')} | Decision: {ev.get('decision_type')} | RT: {ev.get('reaction_time')}s | Urgency: {ev.get('urgency')}\n"
        if not events_str:
            events_str = "No specific event data available."

        # Calculate pressure yield percentage safely
        total_pressure_events = behavioral_state.pressure_yield_count + behavioral_state.pressure_resist_count
        pressure_yield_pct = int((behavioral_state.pressure_yield_count / total_pressure_events * 100)) if total_pressure_events > 0 else 0

        prompt = COGNITIVE_REPORT_PROMPT.format(
            driver_type=behavioral_summary.dominant_pattern,
            personality_label=personality_label,
            self_awareness_score=round(self_awareness_score, 2),
            consistency_score=round(consistency_score, 2),
            safe_ratio_pct=int(behavioral_summary.safe_ratio * 100),
            session_events_str=events_str,
            dominant_pattern=behavioral_summary.dominant_pattern,
            total_events=behavioral_state.total_events,
            consecutive_mistakes=behavioral_state.consecutive_mistakes,
            avg_reaction_time=round(behavioral_state.avg_reaction_time, 2),
            dominant_fail_scenario=behavioral_summary.dominant_fail_scenario,
            pressure_yield_pct=pressure_yield_pct,
            behavior_summary=behavioral_summary.behavior_summary,
        )

        report_data = None
        provider_used = "fallback"

        try:
            response = await llm_provider.complete(
                prompt=prompt,
                agent_type="instructor",
                max_tokens=1500,
                temperature=0.7,
            )
            if response.provider != "fallback":
                provider_used = response.provider
                report_data = self._parse_llm_response(response.text)
                if not report_data:
                    logger.warning(f"Failed to parse Cognitive Report JSON from {provider_used}")
        except Exception as e:
            logger.error(f"Cognitive Report LLM generation failed: {e}")

        if not report_data:
            report_data = self._build_fallback_report(behavioral_summary, personality_label)

        # Extract nested structures
        metrics = report_data.get("metrics", {})

        report = CognitiveReport(
            user_id=user_id,
            session_id=session_id,
            executive_summary=report_data.get("executive_summary", "Behavioral analysis incomplete."),
            cognitive_analysis=report_data.get("cognitive_analysis", "Cognitive patterns could not be determined."),
            emotional_trigger_breakdown=json.dumps(report_data.get("emotional_trigger_breakdown", [])),
            behavioral_timeline=json.dumps(report_data.get("behavioral_timeline", [])),
            attention_stability_analysis=report_data.get("attention_stability_analysis", "Attention metrics unavailable."),
            risk_projection=report_data.get("risk_projection", "Risk projection unavailable."),
            consistency_analysis=report_data.get("consistency_analysis", "Consistency analysis requires onboarding completion."),
            intervention_strategy=json.dumps(report_data.get("intervention_strategy", [])),
            coaching_narrative=report_data.get("coaching_narrative", "Keep practicing to build your behavioral profile."),
            recommended_simulations=json.dumps(report_data.get("recommended_simulations", [])),
            urgency_susceptibility_index=metrics.get("urgency_susceptibility_index", 0.5),
            authority_pressure_sensitivity=metrics.get("authority_pressure_sensitivity", 0.5),
            cognitive_overload_score=metrics.get("cognitive_overload_score", 0.5),
            emotional_reactivity_index=metrics.get("emotional_reactivity_index", 0.5),
            defensive_attention_stability=metrics.get("defensive_attention_stability", 0.5),
            reassurance_seeking_probability=metrics.get("reassurance_seeking_probability", 0.5),
            session_score=session_score,
            safe_decision_rate=behavioral_summary.safe_ratio,
            total_events_in_session=len(session_events),
            driver_profile_at_time=behavioral_summary.dominant_pattern,
            personality_label_at_time=personality_label,
            ai_provider=provider_used,
            generation_stage="complete" if provider_used != "fallback" else "fallback",
        )

        db.add(report)
        await db.flush()
        await db.refresh(report)
        logger.info(f"Cognitive Report generated for user={user_id} session={session_id} via {provider_used}")
        return report

    async def get_latest_report(self, db: AsyncSession, user_id: str) -> Optional[CognitiveReport]:
        """Fetch the most recent cognitive report for a user."""
        result = await db.execute(
            select(CognitiveReport)
            .where(CognitiveReport.user_id == user_id)
            .order_by(CognitiveReport.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    def _parse_llm_response(self, text: str) -> Optional[Dict[str, Any]]:
        """Safely parse JSON from LLM output, handling markdown."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(line for line in lines if not line.startswith("```"))
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            return None
        try:
            data = json.loads(text[start:end])
            required_keys = {"executive_summary", "cognitive_analysis", "coaching_narrative"}
            if not required_keys.issubset(data.keys()):
                return None
            return data
        except json.JSONDecodeError:
            return None

    def _build_fallback_report(self, summary: BehavioralSummary, label: str) -> Dict[str, Any]:
        """Structured local behavioral report fallback."""
        return {
            "executive_summary": f"Your baseline analysis indicates a '{summary.dominant_pattern}' response pattern under simulated load.",
            "cognitive_analysis": "Offline processing indicates potential vulnerabilities in sustained attention under repeated stimulus.",
            "emotional_trigger_breakdown": [{"trigger_type": "urgency", "susceptibility_pct": 50, "explanation": "Fallback baseline."}],
            "behavioral_timeline": [],
            "attention_stability_analysis": "Attention tracking requires cloud AI connectivity for full narrative synthesis.",
            "risk_projection": "Maintain baseline defensive driving protocols until full profiling is available.",
            "consistency_analysis": f"Behavior generally aligns with the '{label}' profile, though advanced modeling is pending.",
            "intervention_strategy": [{"technique": "Foundational Focus", "rationale": "Maintain basic safety thresholds", "priority": "High"}],
            "coaching_narrative": "We couldn't generate a deep psychological profile for this session, but your foundational metrics have been recorded. Keep practicing.",
            "recommended_simulations": [{"type": "Standard Driving", "difficulty": "Medium", "rationale": "Baseline recalibration.", "targets_weakness": "attention"}],
            "metrics": {
                "urgency_susceptibility_index": 0.5, "authority_pressure_sensitivity": 0.5,
                "cognitive_overload_score": 0.5, "emotional_reactivity_index": 0.5,
                "defensive_attention_stability": 0.5, "reassurance_seeking_probability": 0.5
            }
        }

cognitive_report_service = CognitiveReportService()
