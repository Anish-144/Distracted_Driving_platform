"""
Lesson Generation Service — AI-powered personalized lesson engine.

Consumes behavioral state data and generates structured lesson plans via
the existing LLM provider cascade (Gemini → GPT → DeepSeek → offline fallback).

Design principles:
  - Never breaks the simulation flow
  - All LLM calls are async with timeout guard
  - Complete offline fallback pool per driver type
  - Structured JSON parsing with validation
"""

import json
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.user_lesson import UserLesson
from app.models.behavioral_state import BehavioralState
from app.services.llm_provider import llm_provider
from app.services.behavior_analyzer import BehavioralSummary

logger = logging.getLogger(__name__)


# ── Offline Fallback Lesson Pools (by driver type) ────────────────────────────

_FALLBACK_LESSONS = {
    "impulsive": {
        "title": "Impulse Control Under Notification Pressure",
        "behavioral_target": "You react to distractions too quickly — decisions are reflexes, not choices.",
        "why_it_matters": "Impulsive responses to phone distractions increase crash risk by 4x. The first 2 seconds after a distraction appear are the highest-risk window. Training delayed response breaks the automatic trigger-action loop.",
        "ai_coaching_advice": "Your instinct is to respond immediately — that reflex is the problem, not your intention. Practice a 3-second mental pause before any reaction. Count to three silently, then choose. Over time, this pause becomes automatic and replaces the impulsive reflex.",
        "exercises": ["Count to 3 before responding to any in-car alert", "Practice 'commit to ignore' — decide to ignore before the session starts", "Use the next 2 sessions to log every time you feel the urge to react"],
        "personalized_insight": "You perform well when distractions are spaced out, but you deteriorate rapidly under back-to-back pressure events.",
        "improvement_goal": "Reduce sub-2s reactions by 60% within 4 sessions",
        "simulation_modes": ["High-pressure mode", "Rapid multi-event overlap", "Silent mode (no audio cues)"],
        "difficulty": "Intermediate",
        "reaction_time_target": 2.5,
        "distraction_tolerance_target": 0.80,
    },
    "distracted": {
        "title": "Focus Retention Under Digital Distraction",
        "behavioral_target": "Your attention is easily captured by incoming notifications — focus dissolves quickly.",
        "why_it_matters": "Cognitive capture — where the mind follows attention to a stimulus — happens in under 400ms. Once captured, it takes 23 seconds on average to fully re-engage with the road. Every notification is a 23-second focus loan.",
        "ai_coaching_advice": "You are not uniquely susceptible — modern notification systems are engineered to capture attention. The solution is to pre-decide before driving: phone silent, notifications paused, focus committed. Structure beats willpower every time.",
        "exercises": ["Enable Do Not Disturb before every simulated session", "Practice peripheral awareness scanning every 5 seconds", "Identify the exact moment your focus broke — name it after each event"],
        "personalized_insight": "Your safe decision rate improves significantly in the second half of sessions — you recover well but take too long to establish focus.",
        "improvement_goal": "Achieve 85% safe decision rate consistently across 5 sessions",
        "simulation_modes": ["Multi-distraction filtering mode", "Delayed interruption mode", "Ambient noise mode"],
        "difficulty": "Beginner",
        "reaction_time_target": 3.0,
        "distraction_tolerance_target": 0.85,
    },
    "hesitant": {
        "title": "Decisive Action Under Uncertainty",
        "behavioral_target": "You hesitate too long before responding — slow decisions create their own safety risk.",
        "why_it_matters": "Extended decision time (>5 seconds) means prolonged cognitive engagement with the distraction, not reduced risk. Hesitation is not safety — it is uncertainty extended. A delayed wrong decision is worse than a quick correct one.",
        "ai_coaching_advice": "Your hesitation comes from wanting to make the right call — that instinct is correct, but the execution needs speed. Pre-deciding your response policy eliminates the need to decide in the moment. Before each session: decide once, apply always.",
        "exercises": ["Set a 3-second decision rule: if in doubt, ignore the distraction", "Practice immediate commitment — no second-guessing after the choice is made", "Review your hesitation patterns — which scenarios take longest to decide?"],
        "personalized_insight": "You make the right decision most of the time, but the time spent deciding costs you cognitively and statistically.",
        "improvement_goal": "Reduce average response time from 6s+ to under 4s within 3 sessions",
        "simulation_modes": ["Timed decision mode", "High-stakes scenario mode", "Confidence training sequence"],
        "difficulty": "Intermediate",
        "reaction_time_target": 3.5,
        "distraction_tolerance_target": 0.80,
    },
    "inconsistent": {
        "title": "Building a Consistent Safe Driving Identity",
        "behavioral_target": "Your performance varies significantly — safe in some scenarios, risky in others without clear pattern.",
        "why_it_matters": "Inconsistency indicates context-dependent decision-making. This means your safety behavior depends on mood, tiredness, or situation — which are unreliable. Real safety requires context-independent consistent behavior.",
        "ai_coaching_advice": "Your variability suggests you respond to each situation fresh rather than from a consistent decision framework. The goal is to build a non-negotiable personal rule: phone goes silent before the car moves. No exceptions. Consistency is a habit, not a talent.",
        "exercises": ["Identify the 3 scenarios where you most commonly make unsafe decisions", "Create a pre-drive checklist: phone position, DND status, destination set", "Track consistency score across 5 sessions — aim to reduce variance"],
        "personalized_insight": "Your best sessions show you are capable of excellent focus. The challenge is making that consistency your floor, not your ceiling.",
        "improvement_goal": "Reduce session score variance to ±10 points within 6 sessions",
        "simulation_modes": ["Standard randomized mode", "Consistency challenge mode", "Mixed-difficulty sequence"],
        "difficulty": "Advanced",
        "reaction_time_target": 2.8,
        "distraction_tolerance_target": 0.82,
    },
    "safe": {
        "title": "Advanced Situational Awareness Mastery",
        "behavioral_target": "You perform excellently under standard conditions — now challenge yourself under extreme pressure.",
        "why_it_matters": "Safe drivers face the unique risk of complacency. When conditions change — fatigue, passengers, night driving, high-urgency situations — even disciplined drivers experience performance drops. Advanced training closes that gap.",
        "ai_coaching_advice": "You have built a strong safety foundation. The next level is resilience under adversity — can you maintain this standard when exhausted, emotionally stressed, or under social pressure? These modules will find and strengthen your edge cases.",
        "exercises": ["Complete sessions in high-pressure mode with 50% more events", "Test performance under social pressure simulation", "Mentor mode: explain your decisions aloud after each event"],
        "personalized_insight": "Your safe decision rate is excellent. Your next growth area is maintaining that standard under compound distraction scenarios.",
        "improvement_goal": "Maintain 95%+ safe decision rate under advanced difficulty within 4 sessions",
        "simulation_modes": ["Expert pressure mode", "Multi-passenger simulation", "Night driving mode"],
        "difficulty": "Advanced",
        "reaction_time_target": 2.0,
        "distraction_tolerance_target": 0.95,
    },
    "unknown": {
        "title": "Foundation Safe Driving Curriculum",
        "behavioral_target": "Build your baseline safe driving response patterns before your profile is established.",
        "why_it_matters": "The first sessions establish your behavioral baseline. Safe decisions in these early sessions build cognitive pathways that become automatic over time. Your choices now are literally programming your future instincts.",
        "ai_coaching_advice": "Welcome to SafeDrive AI. Your first goal is simple: ignore every distraction during simulation. Do not evaluate whether it's important. Do not check what it is. Just ignore it and keep focus on the road. This builds the automatic safe response.",
        "exercises": ["Complete 3 simulation sessions to establish your baseline", "Focus on the 'ignore first' principle for every notification", "Note which distractions feel hardest to ignore — that's your primary training target"],
        "personalized_insight": "Your behavioral profile is being established. Each session gives the AI more data to personalize your lesson plan.",
        "improvement_goal": "Complete 3 sessions to unlock a personalized driver profile",
        "simulation_modes": ["Standard beginner mode", "Guided tutorial mode"],
        "difficulty": "Beginner",
        "reaction_time_target": 3.0,
        "distraction_tolerance_target": 0.70,
    },
}


# ── LLM Prompt Template ───────────────────────────────────────────────────────

LESSON_PROMPT = """\
You are an elite behavioral driving safety coach and psychological learning architect.
Your task is to generate a highly customized, non-repetitive, contextually rich, and session-aware lesson plan.

CRITICAL REQUIREMENT:
- NEVER generate a generic title like "Foundation Safe Driving Curriculum" or repetitive titles.
- The title MUST be deeply specific to the combination of their driver profile, latest session mistakes, and dominant fail scenario.
- Avoid boring headers. Make the lesson title dynamic, professional, and psychology-centric.

TITLE EXAMPLES:
- For Impulsive Driver: "Impulse Suppression Under Urgent Notifications", "Controlling Split-Second Phone Reactions", "High-Pressure Decision Stabilization", "Reflex Inhibition and Focused Control"
- For Distracted Driver: "Maintaining Focus During Multi-Alert Traffic", "Notification Filtering & Road Awareness", "Visual Attention Reinforcement", "Digital Attention Shield & Lane Discipline"
- For Hesitant Driver: "Rapid Prioritization Under Pressure", "Confidence Building During Hazard Response", "Reducing Cognitive Hesitation Times", "Streamlining Hazard Response Reflexes"
- For Safe Driver: "Advanced Situational Awareness Mastery", "Pre-emptive Hazard Scanning", "Extreme Pressure Resilience Training"

COACHING EXPLANATION REQUIREMENT:
- Do NOT output generic, repetitive tips like "Ignore distractions."
- Provide deep psychological evaluation and cognitive framing. Example: "Your reaction timing indicates that urgency cues override your defensive driving instincts. This lesson trains delayed cognitive evaluation before reacting to alerts."
- Connect their dominant mistake and average reaction time explicitly inside the coaching advice.

DATA LOG FOR GENERATION:
DRIVER PROFILE: {driver_type}
TOTAL SESSIONS: {total_events} decisions recorded
SAFE DECISION RATE: {safe_ratio_pct}%
AVG REACTION TIME: {avg_reaction_time}s
CONSECUTIVE MISTAKES IN LAST SESSION: {consecutive_mistakes}
DOMINANT FAIL SCENARIO: {dominant_fail_scenario}
PRESSURE YIELD RATE: {pressure_yield_pct}% (yielded to pressure {pressure_yield} times, resisted {pressure_resist} times)
BEHAVIORAL SUMMARY: {behavior_summary}

LATEST SESSION MISTAKES: {latest_mistakes_str}

Generate a structured personalized lesson plan. Return ONLY valid JSON, no markdown, no explanation.

{{
  "title": "Deeply customized dynamic lesson title specific to their mistakes & profile (max 10 words)",
  "behavioral_target": "The specific weakness this lesson targets, highlighting the scenario they failed (1-2 sentences)",
  "why_it_matters": "Psychological + safety rationale. Explain how their specific reaction time or mistake pattern increases risk (2-3 sentences with a statistic)",
  "ai_coaching_advice": "Deep, psychology-based coaching advice referencing their exact mistakes and how they can build cognitive pauses or prioritization models (3-5 sentences)",
  "exercises": ["Unique scenario-specific exercise 1", "Unique scenario-specific exercise 2", "Unique scenario-specific exercise 3"],
  "personalized_insight": "Behavioral pattern analysis based on their dominant fail scenario (1-2 sentences)",
  "improvement_goal": "A precise, highly measurable, behavior-specific target (e.g. Reduce sub-2.5s phone responses by 50% within 3 sessions)",
  "simulation_modes": ["Specific mode 1", "Specific mode 2"],
  "difficulty": "Beginner|Intermediate|Advanced",
  "reaction_time_target": 2.5,
  "distraction_tolerance_target": 0.85,
  "generated_reason": "Specific reason this lesson was generated traceably (e.g. Generated after your 'Phone Call' simulation where repeated impulsive interactions were detected.)",
  "recommended_focus": "What specific cognitive filter or ignore rule the user should practice next"
}}"""


# ── Main Service ──────────────────────────────────────────────────────────────

class LessonGenerationService:

    async def generate_lesson(
        self,
        db: AsyncSession,
        user_id: str,
        behavioral_summary: BehavioralSummary,
        behavioral_state: BehavioralState,
        latest_mistakes_str: str = "No recent mistakes.",
        session_id: str | None = None
    ) -> UserLesson:
        """
        Generate and persist a new personalized lesson for this user.
        Uses LLM cascade with structured offline fallback.
        """
        driver_type = behavioral_summary.dominant_pattern

        # Build context-rich prompt
        prompt = LESSON_PROMPT.format(
            driver_type=driver_type,
            total_events=behavioral_state.total_events,
            safe_ratio_pct=int(behavioral_summary.safe_ratio * 100),
            avg_reaction_time=round(behavioral_summary.avg_reaction_time, 1),
            consecutive_mistakes=behavioral_summary.consecutive_mistakes,
            dominant_fail_scenario=behavioral_summary.dominant_fail_scenario.replace("_", " "),
            pressure_yield_pct=int(
                behavioral_state.pressure_yield_count /
                max(behavioral_state.pressure_yield_count + behavioral_state.pressure_resist_count, 1)
                * 100
            ),
            pressure_yield=behavioral_state.pressure_yield_count,
            pressure_resist=behavioral_state.pressure_resist_count,
            behavior_summary=behavioral_summary.behavior_summary,
            latest_mistakes_str=latest_mistakes_str,
        )

        lesson_data = None
        provider_used = "fallback"

        try:
            response = await llm_provider.complete(
                prompt=prompt,
                agent_type="instructor",
                max_tokens=600,
                temperature=0.75,
            )
            if response.provider != "fallback":
                provider_used = response.provider
                lesson_data = self._parse_llm_response(response.text)
        except Exception as e:
            logger.warning("Lesson LLM generation failed: %s", e)

        if lesson_data is None:
            base_fallback = _FALLBACK_LESSONS.get(driver_type, _FALLBACK_LESSONS["unknown"]).copy()
            
            # Select varied title based on latest mistakes & driver type
            titles_by_type = {
                "impulsive": [
                    "Impulse Suppression Under Urgent Notifications",
                    "Controlling Split-Second Phone Reactions",
                    "High-Pressure Decision Stabilization",
                    "Reflex Inhibition and Focused Control",
                    "Cognitive Deliberation in Urgent Traffic"
                ],
                "distracted": [
                    "Maintaining Focus During Multi-Alert Traffic",
                    "Notification Filtering & Road Awareness",
                    "Visual Attention Reinforcement",
                    "Digital Attention Shield & Lane Discipline",
                    "Pre-deciding Safe Attention Policies"
                ],
                "hesitant": [
                    "Rapid Prioritization Under Pressure",
                    "Confidence Building During Hazard Response",
                    "Decisive Action Under Uncertainty",
                    "Streamlining Hazard Response Reflexes",
                    "Reducing Cognitive Hesitation Times"
                ],
                "safe": [
                    "Advanced Situational Awareness Mastery",
                    "Pre-emptive Hazard Scanning",
                    "Extreme Pressure Resilience Training",
                    "Defensive Consistency Under Exhaustion"
                ]
            }
            
            variation_titles = titles_by_type.get(driver_type, [
                "Tailored Safety Focus and Awareness",
                "Defensive Response Custom Curriculum",
                "Cognitive Attention Regulation"
            ])
            
            # Use hash of mistakes to be deterministic yet highly varied per session
            import hashlib
            hash_val = int(hashlib.md5(latest_mistakes_str.encode('utf-8')).hexdigest(), 16)
            idx = hash_val % len(variation_titles)
            base_fallback["title"] = variation_titles[idx]
            
            # Dynamically determine generated reason & recommended focus
            if "incoming_call" in latest_mistakes_str.lower() or "phone" in latest_mistakes_str.lower():
                base_fallback["generated_reason"] = "Generated after your 'Urgent Phone Call' simulation where repeated impulsive interactions were detected."
                base_fallback["recommended_focus"] = "Build a 3-second pause rule before touching any phone alert."
            elif "whatsapp" in latest_mistakes_str.lower() or "chat" in latest_mistakes_str.lower():
                base_fallback["generated_reason"] = "Generated after your 'WhatsApp Notification' simulation where digital distractions captured lane focus."
                base_fallback["recommended_focus"] = "Practice ignoring visual overlays completely during transit."
            elif "gps" in latest_mistakes_str.lower() or "rerout" in latest_mistakes_str.lower():
                base_fallback["generated_reason"] = "Generated after your 'GPS Rerouting' simulation where reaction delay exceeded safe parameters."
                base_fallback["recommended_focus"] = "Keep eyes strictly on center lane marker during GPS route updates."
            else:
                base_fallback["generated_reason"] = "Generated from your latest driving baseline telemetry and behavior state logs."
                base_fallback["recommended_focus"] = "Maintain high situational awareness and consistent lane keeping."
                
            lesson_data = base_fallback

        user_lesson = UserLesson(
            user_id=user_id,
            title=lesson_data.get("title", "Personalized Safety Lesson"),
            behavioral_target=lesson_data.get("behavioral_target", ""),
            why_it_matters=lesson_data.get("why_it_matters", ""),
            ai_coaching_advice=lesson_data.get("ai_coaching_advice", ""),
            exercises=json.dumps(lesson_data.get("exercises", [])),
            personalized_insight=lesson_data.get("personalized_insight", ""),
            improvement_goal=lesson_data.get("improvement_goal", ""),
            simulation_modes=json.dumps(lesson_data.get("simulation_modes", [])),
            difficulty=lesson_data.get("difficulty", "Intermediate"),
            driver_type=driver_type,
            reaction_time_target=float(lesson_data.get("reaction_time_target", 2.5)),
            distraction_tolerance_target=float(lesson_data.get("distraction_tolerance_target", 0.85)),
            generated_reason=lesson_data.get("generated_reason", ""),
            recommended_focus=lesson_data.get("recommended_focus", ""),
            session_id=session_id,
            ai_provider=provider_used,
            completed=False,
        )
        db.add(user_lesson)
        await db.flush()
        await db.refresh(user_lesson)
        logger.info(
            "Lesson generated for user=%s driver_type=%s via %s",
            user_id, driver_type, provider_used
        )
        return user_lesson

    async def get_active_lessons(
        self, db: AsyncSession, user_id: str, limit: int = 5
    ) -> list[UserLesson]:
        """Return the most recent incomplete lessons for a user."""
        result = await db.execute(
            select(UserLesson)
            .where(UserLesson.user_id == user_id, UserLesson.completed == False)
            .order_by(desc(UserLesson.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_all_lessons(
        self, db: AsyncSession, user_id: str
    ) -> list[UserLesson]:
        """Return full lesson history for a user."""
        result = await db.execute(
            select(UserLesson)
            .where(UserLesson.user_id == user_id)
            .order_by(desc(UserLesson.created_at))
        )
        return list(result.scalars().all())

    async def mark_completed(
        self,
        db: AsyncSession,
        lesson_id: str,
        user_id: str,
        completion_score: float = 100.0,
    ) -> UserLesson | None:
        """Mark a lesson as completed with an optional score."""
        from datetime import datetime, timezone
        result = await db.execute(
            select(UserLesson).where(
                UserLesson.id == lesson_id,
                UserLesson.user_id == user_id,
            )
        )
        lesson = result.scalar_one_or_none()
        if lesson is None:
            return None
        lesson.completed = True
        lesson.completion_score = completion_score
        lesson.completed_at = datetime.now(timezone.utc)
        db.add(lesson)
        await db.flush()
        await db.refresh(lesson)
        return lesson

    def _parse_llm_response(self, text: str) -> dict | None:
        """
        Safely parse JSON from LLM output.
        Handles markdown code blocks and partial responses.
        """
        text = text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(
                line for line in lines
                if not line.startswith("```")
            )
        # Find first { to last }
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            return None
        try:
            data = json.loads(text[start:end])
            # Validate required keys exist
            required = {"title", "behavioral_target", "ai_coaching_advice", "exercises"}
            if not required.issubset(data.keys()):
                return None
            return data
        except json.JSONDecodeError:
            return None


# ── Singleton ──────────────────────────────────────────────────────────────────
lesson_generation_service = LessonGenerationService()
