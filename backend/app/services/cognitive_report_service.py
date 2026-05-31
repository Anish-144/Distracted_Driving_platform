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
        """Driver-type-specific local behavioral report fallback."""
        pattern = summary.dominant_pattern

        _SUMMARIES = {
            "impulsive": (
                f"Your session revealed a high-frequency impulsive response pattern — sub-2-second reactions "
                f"that bypass conscious decision-making. With a {int(summary.safe_ratio * 100)}% safe decision rate, "
                f"your prefrontal inhibition system is being overridden by stimulus-response reflexes under urgency conditions."
            ),
            "distracted": (
                f"Your behavioral profile shows attentional fragmentation — the simulation captured repeated "
                f"attention shifts toward incoming stimuli before conscious evaluation. "
                f"A {int(summary.safe_ratio * 100)}% safe decision rate indicates that notification-triggered cognitive capture "
                f"is your primary vulnerability."
            ),
            "hesitant": (
                f"Extended decision latency was the dominant behavioral signature in your session. "
                f"With a {int(summary.safe_ratio * 100)}% safe decision rate, your caution instinct is overcorrecting — "
                f"prolonged uncertainty windows consume more cognitive bandwidth than the distractions themselves."
            ),
            "safe": (
                f"Your session demonstrates strong baseline performance with a {int(summary.safe_ratio * 100)}% safe decision rate. "
                f"The training frontier now shifts to compound-distraction resilience — maintaining this standard "
                f"under simultaneous pressures and fatigue conditions."
            ),
            "unknown": (
                f"Your baseline behavioral profile is being established from this session. "
                f"A {int(summary.safe_ratio * 100)}% safe decision rate provides the initial calibration point "
                f"from which all future personalized interventions will be derived."
            ),
        }

        _COGNITIVE_ANALYSES = {
            "impulsive": (
                "The dominant cognitive mechanism is stimulus-response override: incoming alerts trigger dopamine anticipation "
                "that bypasses the prefrontal cortex's inhibitory gating before a conscious decision forms. "
                "This manifests as sub-2-second interactions where the motor response initiates before awareness registers."
            ),
            "distracted": (
                "Attentional capture is the primary cognitive failure mode: the brain's salience network involuntarily "
                "redirects focus toward novel stimuli before executive attention can maintain task anchoring. "
                "Smartphone notifications are precision-engineered to trigger this exact response."
            ),
            "hesitant": (
                "The dominant pattern is approach-avoidance conflict cycling — the decision system oscillates between "
                "engagement and avoidance without committing. This prolongs the cognitive load window beyond the "
                "distraction event itself, paradoxically increasing total attentional cost."
            ),
            "safe": (
                "Your cognitive filtering is functioning at a high level, maintaining task anchoring against standard "
                "distraction triggers. The primary remaining vulnerability is compound-load degradation — "
                "performance under simultaneous urgency cues where sustained inhibition becomes metabolically costly."
            ),
            "unknown": (
                "Initial session data indicates foundational stimulus-response patterns that will determine your "
                "habitual behavioral profile. Early session decisions carry disproportionate weight in establishing "
                "the automatic neural pathways that govern future in-car behavior."
            ),
        }

        _RISK_PROJECTIONS = {
            "impulsive": (
                "If impulsive reaction patterns continue uncorrected, the probability of a real-world distraction-related "
                "incident increases with driving hours. Habitual sub-2-second response loops become increasingly automatic "
                "and harder to intercept as they are reinforced by each unchecked reflex."
            ),
            "distracted": (
                "Persistent attentional fragmentation increases hazard detection failure rates by 37% even when the "
                "driver's eyes return to the road within 2 seconds. The cognitive re-engagement delay, not the "
                "physical glance, is the primary accident risk vector."
            ),
            "hesitant": (
                "Chronic hesitation under distraction creates a dangerous hybrid state where neither full road "
                "attention nor a committed decision exists. Under real-world high-stakes scenarios, hesitation "
                "latency tends to increase as perceived consequences rise, creating worst-case performance in highest-risk moments."
            ),
            "safe": (
                "Expert-level performance in controlled simulation does not fully generalize to real-world compound "
                "conditions. Studies show 18-34% performance degradation under night driving, extreme weather, or "
                "unfamiliar routes — advanced training closes this generalization deficit."
            ),
            "unknown": (
                "Early behavioral patterns established in training show the highest persistence over time. "
                "Correct responses in these initial sessions literally build the neural pathways that become "
                "protective automaticity in real driving conditions."
            ),
        }

        _COACHING_NARRATIVES = {
            "impulsive": (
                "The data is unambiguous: your responses are happening before your decisions are formed. "
                "That's not carelessness — it's a conditioned reflex that your training system is specifically designed to intercept. "
                "The counter-measure is structural: insert a 3-second delay between stimulus and response, every time, without exception. "
                "Over 4-6 sessions, this pause becomes the new automatic behavior, permanently replacing the impulsive reflex."
            ),
            "distracted": (
                "Your attention is being captured by stimuli that are engineered to be irresistible — that's not a character flaw. "
                "The solution is structural, not motivational: pre-decide your distraction policy before the session begins. "
                "Commit to silent mode. Every session where you enforce this builds the attentional inertia that eventually "
                "makes the automatic response 'ignore' rather than 'check.'"
            ),
            "hesitant": (
                "Your instinct to be careful is correct — the implementation needs acceleration. "
                "Uncertainty is the enemy: the longer you hold a decision open, the higher the cognitive cost. "
                "Pre-commit to a single rule before every session: 'When uncertain, I ignore.' "
                "Apply it without exception. The certainty of the rule eliminates the decision loop entirely."
            ),
            "safe": (
                "You've built something real: a consistent, reliable safety baseline that holds under standard conditions. "
                "The next phase is resilience training — maintaining this standard when fatigued, under social pressure, "
                "or facing compound distraction loads. Your vulnerability isn't impulse. It's complacency under conditions "
                "that feel manageable but carry hidden cognitive cost."
            ),
            "unknown": (
                "These early sessions are establishing your behavioral baseline — the data being collected now will "
                "determine your entire personalized training program. The most valuable thing you can do right now "
                "is apply the ignore-first principle consistently, without evaluating each distraction individually. "
                "That consistency is what teaches your brain the safe default response."
            ),
        }

        executive_summary = _SUMMARIES.get(pattern, _SUMMARIES["unknown"])
        cognitive_analysis = _COGNITIVE_ANALYSES.get(pattern, _COGNITIVE_ANALYSES["unknown"])
        risk_projection = _RISK_PROJECTIONS.get(pattern, _RISK_PROJECTIONS["unknown"])
        coaching_narrative = _COACHING_NARRATIVES.get(pattern, _COACHING_NARRATIVES["unknown"])

        return {
            "executive_summary": executive_summary,
            "cognitive_analysis": cognitive_analysis,
            "emotional_trigger_breakdown": [
                {"trigger_type": "urgency", "susceptibility_pct": max(10, 100 - int(summary.safe_ratio * 100)),
                 "explanation": f"Based on {int(summary.safe_ratio * 100)}% safe decision rate across session events."}
            ],
            "behavioral_timeline": [],
            "attention_stability_analysis": (
                f"Behavioral pattern '{pattern}' detected across {int(summary.safe_ratio * 100)}% safe decisions. "
                f"Average reaction time: {round(summary.avg_reaction_time, 2)}s. "
                f"Consecutive mistakes tracked: {summary.consecutive_mistakes}."
            ),
            "risk_projection": risk_projection,
            "consistency_analysis": (
                f"Behavior classified as '{pattern}' — aligns with '{label}' onboarding profile. "
                f"Advanced mismatch analysis requires full LLM processing."
            ),
            "intervention_strategy": [
                {"technique": "Behavioral Pre-commitment", "rationale": "Decide ignore policy before session starts", "priority": "High"},
                {"technique": "Stimulus-Response Delay", "rationale": "Insert 3-second pause between distraction onset and any reaction", "priority": "High"},
            ],
            "coaching_narrative": coaching_narrative,
            "recommended_simulations": [
                {"type": "Standard Distraction Mode", "difficulty": "Medium",
                 "rationale": f"Foundational training for {pattern} profile.", "targets_weakness": pattern}
            ],
            "metrics": {
                "urgency_susceptibility_index": round(1 - summary.safe_ratio, 2),
                "authority_pressure_sensitivity": 0.5,
                "cognitive_overload_score": round(min(1.0, summary.consecutive_mistakes / 5.0), 2),
                "emotional_reactivity_index": round(1 - summary.safe_ratio + 0.1, 2),
                "defensive_attention_stability": round(summary.safe_ratio, 2),
                "reassurance_seeking_probability": 0.3,
            }
        }

cognitive_report_service = CognitiveReportService()
