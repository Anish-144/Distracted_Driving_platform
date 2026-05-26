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
        "lesson_category": "Cognitive Control",
        "behavioral_diagnosis": "You react to distractions too quickly — your decisions are reflexes, not conscious choices. Sub-2-second responses to phone notifications indicate that your cognitive filter is bypassed, creating a direct stimulus-response loop that bypasses rational decision-making entirely.",
        "psychological_interpretation": "Impulsive responding is driven by the brain's reward pathway: notifications trigger dopamine anticipation, overriding the prefrontal cortex's braking mechanism. The faster the reflex, the deeper the habitual pathway. Each unchecked impulsive reaction reinforces the neural circuit.",
        "real_world_risk_impact": "Impulsive phone interactions while driving increase crash risk by 4.1x compared to sober driving (NHTSA, 2023). The first 2 seconds after a distraction appears is the highest-risk window — when your instinct fires before your judgment activates.",
        "cognitive_coaching_narrative": "Your instinct is to respond immediately — that reflex is the problem, not your intention. The solution is not willpower; it's a deliberate 3-second mental pause inserted between stimulus and response. Count silently: one, two, three. By then, the urgency feeling dissipates. Over repeated practice, this pause becomes automatic and permanently replaces the impulsive reflex.",
        "scenario_replay_analysis": "In your recent session, when the phone notification appeared, your response latency was under 2 seconds — suggesting the decision was made before conscious evaluation. The cognitive failure occurred between notification onset and your first muscle movement. You reacted before you decided.",
        "behavioral_exercises": ["Count to 3 silently before making any response to in-car alerts", "Practice the 'commit-to-ignore' rule: decide before the session starts that all notifications will be ignored", "Log every moment you feel the urge to react but successfully suppress it"],
        "mental_conditioning_techniques": ["Use implementation intentions: 'When I hear a notification, I will count three breaths before responding'", "Practice delayed gratification exercises: wait 30 seconds before checking your phone outside driving", "Use cognitive defusion: label the impulse ('I notice the urge to check') without acting on it"],
        "attention_reinforcement_tasks": ["Enable Do Not Disturb before every simulation session", "Practice high-density distraction mode: force yourself to ignore 10 consecutive alerts", "Complete two sessions in silence mode with no audio cues — visual-only discipline training"],
        "future_risk_projection": "If sub-2-second impulsive reactions continue uncorrected, the probability of a real-world distraction-related incident increases quadratically with driving hours. Habitual impulsive behavior becomes increasingly automatic and harder to intercept over time.",
        "personalized_improvement_strategy": "Focus on the 3-second pause rule as a non-negotiable. Track your sub-2s reactions per session — target a 60% reduction within 4 sessions. Progress to the Advanced Pressure Resilience module once you sustain <1 impulsive reaction per session consistently.",
        "difficulty": "Intermediate",
        "reaction_time_target": 2.5,
        "distraction_tolerance_target": 0.80,
    },
    "distracted": {
        "title": "Focus Retention Under Digital Distraction",
        "lesson_category": "Attention Regulation",
        "behavioral_diagnosis": "Your attention is easily captured by incoming notifications — focus dissolves within 400ms of distraction onset. The pattern suggests low attentional inertia: your mental grip on the driving task is interrupted before your conscious decision process engages.",
        "psychological_interpretation": "Cognitive capture occurs when environmental stimuli hijack the brain's attentional spotlight involuntarily. Smartphone notifications are specifically engineered to trigger this response using variable reward conditioning. Once captured, full re-engagement with the primary task takes 23 seconds on average.",
        "real_world_risk_impact": "A 5-second glance at a notification at 60 mph means driving the length of a football field completely blind. Studies show that cognitive capture reduces hazard detection by 37%, even when eyes return to the road within 2 seconds.",
        "cognitive_coaching_narrative": "You are not uniquely susceptible — modern notification systems are precision-engineered to capture attention. The solution is structural, not motivational: commit your phone to silent mode before the car moves. Pre-decide. Structure beats willpower every time. Your attention is a finite resource — protect it before the drive, not during it.",
        "scenario_replay_analysis": "During your simulation, focus fragmentation was detected when simultaneous alerts competed for attention. Your scan pattern shifted from forward-road to distraction-source within the first 500ms — indicating attentional pull overrode spatial anchoring. The road was lost before awareness registered it.",
        "behavioral_exercises": ["Enable Do Not Disturb before every simulated session — treat it as a pre-flight checklist item", "Practice active peripheral awareness: every 5 seconds, consciously name one thing at the edge of your visual field", "Identify the exact moment your focus broke in each session — name the trigger explicitly"],
        "mental_conditioning_techniques": ["Use attention anchoring: pick a fixed road feature (center line, horizon) and return to it after every interruption", "Practice mindfulness of attention: notice when your focus drifts without judgment, then deliberately redirect", "Pre-session visualization: imagine the drive with zero attention breaks for 30 seconds before starting"],
        "attention_reinforcement_tasks": ["Complete 3 consecutive sessions with zero voluntary distraction interactions", "Practice multi-distraction filtering mode — maintain safe decision rate above 85%", "Run ambient noise simulation to build focus resilience against background distraction"],
        "future_risk_projection": "Persistent attentional fragmentation patterns correlate with significantly elevated intersection hazard risk. Without intervention, cognitive capture episodes will increase in frequency as notification density increases in real driving environments.",
        "personalized_improvement_strategy": "Target 85% safe decision rate consistently across 5 sessions. Begin with single-distraction scenarios, progress to dual-distraction, then high-density environments. Treat focus as a skill, not a personality trait — it is trainable with deliberate repetition.",
        "difficulty": "Beginner",
        "reaction_time_target": 3.0,
        "distraction_tolerance_target": 0.85,
    },
    "hesitant": {
        "title": "Decisive Action Under Uncertainty",
        "lesson_category": "Defensive Decision",
        "behavioral_diagnosis": "You hesitate too long before responding — extended decision latency above 5 seconds indicates uncertainty-based paralysis rather than deliberate caution. This prolonged cognitive engagement with the distraction itself creates a safety risk separate from the distraction.",
        "psychological_interpretation": "Hesitation is the mind seeking certainty before committing — but in time-pressured environments, certainty is unavailable. The decision loop cycles repeatedly: evaluate, doubt, re-evaluate. Each cycle costs time without improving outcomes. Pre-commitment eliminates this loop entirely.",
        "real_world_risk_impact": "Decision latency above 5 seconds means the distraction monopolizes cognitive bandwidth for an extended window. Research shows a delayed wrong decision is statistically worse than a fast correct one — because the cognitive cost of extended uncertainty is non-zero.",
        "cognitive_coaching_narrative": "Your hesitation comes from wanting to make the perfect call — that instinct is correct, but the execution needs speed. The solution is pre-deciding your response policy: before every session, commit to a single rule: 'If I am uncertain, I ignore the distraction.' Applied consistently, this eliminates the decision loop entirely and replaces uncertainty with trained automaticity.",
        "scenario_replay_analysis": "In your simulation, the decision latency between distraction onset and response exceeded the 3-second safety threshold multiple times. The behavioral signature shows repeated oscillation: approach-avoidance conflict cycling between ignoring and interacting before committing. The hesitation itself consumed more cognitive load than the distraction.",
        "behavioral_exercises": ["Set a 3-second decision rule: after 3 seconds of uncertainty, the default choice is always ignore", "Practice immediate commitment — no second-guessing after a choice is made within the session", "Review your hesitation log: which scenario types take the longest? That's your primary training target."],
        "mental_conditioning_techniques": ["Use pre-commitment contracts: write your ignore-rule before starting each session", "Practice confidence anchoring: recall a session where your fast ignore-decision was correct", "Implement 'first instinct' training: trust your initial safe response without overriding it"],
        "attention_reinforcement_tasks": ["Complete timed decision mode with a 3-second forced decision window", "Run high-stakes scenario mode to build rapid commitment under pressure", "Practice confidence training sequences with increasing urgency cues"],
        "future_risk_projection": "Chronic hesitation under distraction creates a dangerous hybrid state: eyes on the distraction, mind on the decision, neither fully on the road. Without training, hesitation latency tends to increase as perceived stakes increase, creating worst-case performance in highest-risk scenarios.",
        "personalized_improvement_strategy": "Reduce average response time from 6s+ to under 4s within 3 sessions. Use timed decision mode as primary training tool. Progress to confidence-building module once sub-4s responses are consistent for two consecutive sessions.",
        "difficulty": "Intermediate",
        "reaction_time_target": 3.5,
        "distraction_tolerance_target": 0.80,
    },
    "inconsistent": {
        "title": "Building a Consistent Safe Driving Identity",
        "lesson_category": "Recovery & Adaptation",
        "behavioral_diagnosis": "Your performance varies significantly across sessions — safe in some scenarios, risky in others without a predictable pattern. This inconsistency indicates context-dependent decision-making: your safety behavior is influenced by mood, cognitive load, or situational factors rather than a stable behavioral framework.",
        "psychological_interpretation": "Inconsistency is a signature of context-sensitive responding — the brain applies different heuristics depending on perceived effort, stress, or social context. Without a non-negotiable decision rule, the cognitive system defaults to the path of least resistance, which varies with internal state.",
        "real_world_risk_impact": "Inconsistent drivers are statistically at higher risk under novel conditions — night driving, unfamiliar routes, or elevated traffic. When habitual safety routines are absent, novel situations trigger decision uncertainty that resolves toward unsafe behavior at elevated rates.",
        "cognitive_coaching_narrative": "Your best sessions demonstrate you are fully capable of excellent focused performance. The challenge is making that your floor, not your ceiling. The goal is a non-negotiable rule: phone silent before the car moves, every single time. Consistency is not a talent — it is a repeatable behavior that becomes identity through repetition.",
        "scenario_replay_analysis": "Cross-session analysis shows your safe decision rate varies by up to 40% between sessions — indicating response selection is influenced by contextual factors rather than a stable policy. Sessions with elevated performance share a common pattern: early commitment to ignore-first strategy in the opening 3 events.",
        "behavioral_exercises": ["Identify the 3 scenarios where you most frequently make unsafe decisions — list them before each session", "Create a pre-drive checklist: phone silent, notifications paused, destination pre-set", "Track consistency score across 6 sessions — aim to reduce variance to ±10 points"],
        "mental_conditioning_techniques": ["Use implementation intentions for your top-3 failure scenarios: 'When X happens, I will Y'", "Practice behavioral rehearsal: mentally simulate 3 correct decisions before starting each session", "Adopt a performance identity statement: 'I am a driver who ignores all distractions'"],
        "attention_reinforcement_tasks": ["Complete standard randomized mode for 3 consecutive sessions tracking consistency score", "Run consistency challenge mode with mixed difficulty sequences", "Compare your best session to your worst: identify the one behavioral difference"],
        "future_risk_projection": "Without a consistent decision framework, performance will remain situationally variable. Fatigue, stress, and emotional arousal will continue to create unpredictable safe-rate drops in real driving environments, increasing incident probability under non-ideal conditions.",
        "personalized_improvement_strategy": "Reduce session score variance to ±10 points within 6 sessions. Establish a consistent pre-drive ritual as your behavioral anchor. Progress to Advanced Consistency module when variance drops below 15 points for 3 consecutive sessions.",
        "difficulty": "Advanced",
        "reaction_time_target": 2.8,
        "distraction_tolerance_target": 0.82,
    },
    "safe": {
        "title": "Advanced Situational Awareness Mastery",
        "lesson_category": "Defensive Decision",
        "behavioral_diagnosis": "You perform excellently under standard simulation conditions — your safe decision rate exceeds the 85th percentile threshold. The training frontier now shifts to resilience under adversity: maintaining this standard during fatigue, compound distraction, and social pressure scenarios.",
        "psychological_interpretation": "High-performers face the unique risk of complacency — a gradual erosion of vigilance as performance becomes automatic and effort perception decreases. Expert-level performance under controlled conditions does not automatically transfer to novel high-stress environments.",
        "real_world_risk_impact": "Research on expert-level skill degradation shows that performance under novel conditions (night driving, extreme weather, passenger distraction) drops by 18-34% even for high-skilled drivers. Advanced training closes this generalization gap.",
        "cognitive_coaching_narrative": "You have built a strong safety foundation — your behavioral consistency is in the top tier. The next performance frontier is resilience: can you maintain this standard when fatigued, emotionally stressed, or under social pressure from passengers? These edge cases are where even expert drivers fail. Advanced training will find and strengthen your vulnerabilities.",
        "scenario_replay_analysis": "Your simulation data shows excellent baseline performance with minor degradation under high-urgency compound scenarios. The behavioral signature of near-expert performance: you maintain safe ratios under single distractions but show marginal hesitation under simultaneous multi-event loads.",
        "behavioral_exercises": ["Complete sessions in high-pressure mode with 50% more events per minute", "Test performance under social pressure simulation with Passenger Agent escalation", "Run mentor mode: articulate your decision rationale aloud after each event"],
        "mental_conditioning_techniques": ["Practice dual-task performance: maintain a mental count while running simulations", "Use stress inoculation: deliberately induce mild urgency then practice calm ignore-decisions", "Pre-session anti-complacency reminder: identify one scenario where you could still fail"],
        "attention_reinforcement_tasks": ["Complete expert pressure mode targeting 95%+ safe decision rate", "Run multi-passenger simulation to test social distraction resilience", "Complete 5 consecutive sessions in advanced mode without dropping below 90%"],
        "future_risk_projection": "Without advanced resilience training, expert-level performance will degrade under real-world compound conditions. The gap between simulation performance and real driving performance widens with complexity — advanced training closes this generalization deficit.",
        "personalized_improvement_strategy": "Maintain 95%+ safe decision rate under advanced difficulty within 4 sessions. Target compound distraction mastery. Progress to Expert Resilience certification track when sustained performance exceeds 95% for 3 consecutive advanced sessions.",
        "difficulty": "Advanced",
        "reaction_time_target": 2.0,
        "distraction_tolerance_target": 0.95,
    },
    "unknown": {
        "title": "Foundation Safe Driving Curriculum",
        "lesson_category": "Defensive Decision",
        "behavioral_diagnosis": "Your behavioral profile is being established — insufficient data exists for deep pattern classification. Your first sessions are building the cognitive baseline from which all future personalized interventions will be derived.",
        "psychological_interpretation": "Early training sessions establish the foundational stimulus-response patterns that form automatic driving habits. Safe decisions in these early sessions build the neural pathways that become instinctive over time. Every correct decision now is literally programming your future reflexes.",
        "real_world_risk_impact": "Behavioral habits formed in the first 10-15 training sessions show the highest persistence over time. Early correct responses create a 'safe default' pathway that activates even under cognitive load and fatigue in real driving conditions.",
        "cognitive_coaching_narrative": "Welcome to SafeDrive AI. Your first goal is elegantly simple: ignore every distraction during simulation. Do not evaluate whether it's important. Do not assess if you should check it. Just ignore it completely and maintain your focus on the road. This builds the automatic safe-response pathway that will protect you in real driving conditions for years.",
        "scenario_replay_analysis": "Initial baseline data collection phase. Your response patterns across the first sessions establish the behavioral signature that the AI uses to classify your driver type and generate personalized training content. Complete 3 sessions to unlock your full personalized profile.",
        "behavioral_exercises": ["Complete 3 simulation sessions to establish your behavioral baseline", "Apply the 'ignore-first' principle to every notification without exception", "Note which distraction types feel hardest to ignore — that is your primary training target"],
        "mental_conditioning_techniques": ["Before each session, state your intention: 'I will ignore all alerts'", "After each session, identify one moment where ignoring was difficult — that's your focus next session", "Practice the 3-second count: when a distraction appears, count to 3 before making any decision"],
        "attention_reinforcement_tasks": ["Complete standard beginner mode for all 3 baseline sessions", "Run guided tutorial mode to understand the scoring and feedback system", "Track your safe decision rate across the first 3 sessions to see your baseline"],
        "future_risk_projection": "Strong early training foundations significantly reduce real-world distraction risk. Drivers who establish consistent ignore-first reflexes in training show 67% fewer distraction-related incidents in real driving environments compared to untrained peers.",
        "personalized_improvement_strategy": "Complete 3 sessions to unlock a personalized driver profile and adaptive lesson plan. Focus on the 'ignore-first' principle without exception. After 3 sessions, the AI will generate a customized intervention plan based on your specific behavioral patterns.",
        "difficulty": "Beginner",
        "reaction_time_target": 3.0,
        "distraction_tolerance_target": 0.70,
    },
}



# ── LLM Prompt Template ───────────────────────────────────────────────────────

LESSON_PROMPT = """\
You are an elite behavioral driving safety coach and psychological learning architect.
Your task is to generate a highly customized, non-repetitive, contextually rich, and session-aware "Behavioral Intervention Module".

CRITICAL REQUIREMENT:
- NEVER generate a generic title. The title MUST be deeply specific to the combination of their driver profile, latest session mistakes, and dominant fail scenario.
- Avoid boring headers. Make the lesson title dynamic, professional, and psychology-centric.
- Provide deep psychological evaluation and cognitive framing, not generic tips like "Ignore distractions."

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
  "lesson_category": "Cognitive Control | Attention Regulation | Emotional Regulation | Defensive Decision | Recovery & Adaptation",
  "behavioral_diagnosis": "Explain the detected weakness (2-3 sentences).",
  "psychological_interpretation": "Why the behavior occurred cognitively/emotionally (2-3 sentences).",
  "real_world_risk_impact": "How this affects real driving behavior with statistics (2 sentences).",
  "cognitive_coaching_narrative": "Human-like adaptive coaching replacing basic advice. Speak directly to the user as a behavioral analyst (3-4 sentences).",
  "scenario_replay_analysis": "Break down an important moment from the simulation and explain where the cognitive failure happened (3-4 sentences).",
  "behavioral_exercises": ["Unique interactive improvement drill 1", "Drill 2"],
  "mental_conditioning_techniques": ["Conditioning technique 1", "Technique 2"],
  "attention_reinforcement_tasks": ["Practical training suggestion 1", "Suggestion 2"],
  "future_risk_projection": "What happens if this behavior continues uncorrected (2 sentences).",
  "personalized_improvement_strategy": "Adaptive intervention roadmap for their next sessions.",
  "difficulty": "Beginner|Intermediate|Advanced",
  "reaction_time_target": 2.5,
  "distraction_tolerance_target": 0.85,
  "generated_reason": "Specific reason this lesson was generated traceably.",
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
            
        if lesson_data is None:
            lesson_data = base_fallback
        else:
            # Merge missing fields from fallback
            for k, v in base_fallback.items():
                if k not in lesson_data or not lesson_data[k]:
                    lesson_data[k] = v

        user_lesson = UserLesson(
            user_id=user_id,
            title=lesson_data.get("title", "Personalized Safety Lesson"),
            lesson_category=lesson_data.get("lesson_category", "Defensive Decision"),
            behavioral_diagnosis=lesson_data.get("behavioral_diagnosis", ""),
            psychological_interpretation=lesson_data.get("psychological_interpretation", ""),
            real_world_risk_impact=lesson_data.get("real_world_risk_impact", ""),
            cognitive_coaching_narrative=lesson_data.get("cognitive_coaching_narrative", ""),
            scenario_replay_analysis=lesson_data.get("scenario_replay_analysis", ""),
            behavioral_exercises=json.dumps(lesson_data.get("behavioral_exercises", [])),
            mental_conditioning_techniques=json.dumps(lesson_data.get("mental_conditioning_techniques", [])),
            attention_reinforcement_tasks=json.dumps(lesson_data.get("attention_reinforcement_tasks", [])),
            future_risk_projection=lesson_data.get("future_risk_projection", ""),
            personalized_improvement_strategy=lesson_data.get("personalized_improvement_strategy", ""),
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
            required = {"title", "behavioral_diagnosis", "cognitive_coaching_narrative"}
            if not required.issubset(data.keys()):
                return None
            return data
        except json.JSONDecodeError:
            return None


# ── Singleton ──────────────────────────────────────────────────────────────────
lesson_generation_service = LessonGenerationService()
