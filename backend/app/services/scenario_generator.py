"""
AI Scenario Generator Service — Dynamic Psychological Scenario Engine.

Generates rich, emotionally adaptive, psychologically unique scenarios
for each simulation event. Replaces static template scenarios with:
  - Environmental context narrative
  - Emotional pressure targeting
  - Psychological escalation chain (3 levels)
  - Personalization by driver profile + trait scores

Design principles:
  - LLM cascade: Gemini → GPT → DeepSeek → structured local fallback
  - Fallback pool is varied and profile-aware (NOT generic)
  - Scenarios never feel templated
  - Each escalation level is a distinct, progressive emotional beat
"""

import json
import logging
import random
import hashlib
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.generated_scenario import GeneratedScenario
from app.models.personality_profile import PersonalityProfile
from app.services.llm_provider import llm_provider
from app.services.personality_profiler import personality_profiler

logger = logging.getLogger(__name__)


# ── Fallback Scenario Pool (structured, profile-aware) ───────────────────────

_FALLBACK_CONTEXTS = {
    "impulsive": {
        "incoming_call": [
            "You're running 15 minutes late for a meeting that's been rescheduled twice already. Traffic is heavy on the expressway. Your manager's name lights up on the screen — third call in 8 minutes.",
            "You just received a heated message from a colleague right before your phone starts ringing from your partner. You're in moderate traffic, mentally processing the earlier conflict.",
            "An important client you've been chasing for weeks is calling. You're on the highway doing 80km/h. Missing this call means losing the deal.",
        ],
        "whatsapp_notification": [
            "You're in stop-and-go traffic, mildly stressed about the day. Your WhatsApp preview shows: 'Please call me back IMMEDIATELY' from your sister.",
            "You just sent a message before starting the car that you regret. You see a reply notification from the same person — you desperately want to see if it's resolved.",
            "You're driving home after a difficult day. A WhatsApp notification buzzes from a group where you're currently in conflict with a team member.",
        ],
        "gps_rerouting": [
            "You're already stressed about being late. Your GPS just rerouted onto an unfamiliar road and you're approaching an intersection you don't recognize.",
            "You're driving to a critical job interview. Your GPS says 'Turn right in 50m' — but you're in the left lane in heavy traffic and need to check if you can still make it.",
        ],
    },
    "distracted": {
        "incoming_call": [
            "You're driving on a familiar route, mind drifting between several unfinished tasks. Your phone rings from a friend — not urgent, but social conversations always draw you in.",
            "You have two browser tabs mentally open, a work problem half-solved, and now your phone starts ringing from an unknown number.",
        ],
        "whatsapp_notification": [
            "You're in low-traffic midday driving, mind elsewhere. Three quick WhatsApp buzzes in a row — it's a group chat that's been active all morning.",
            "You're driving home thinking about dinner plans when a WhatsApp notification arrives from the group chat you've been waiting to see update.",
            "Multiple notifications arrive simultaneously — an email sound, a WhatsApp ping, and your music app notification stacks up while you're in the middle lane.",
        ],
        "gps_rerouting": [
            "You're driving while mentally rehearsing a presentation. Your GPS suddenly announces 'Recalculating' — you realize you missed the turn two streets back.",
        ],
    },
    "hesitant": {
        "incoming_call": [
            "Your phone rings from an unfamiliar number. You're uncertain — could be important, could be spam. You're in moderate traffic and unsure what to do.",
            "Your boss calls right after a tense meeting. You don't know if they want to continue the argument or if it's something new. You're torn whether to answer.",
        ],
        "whatsapp_notification": [
            "A message arrives from someone you recently had a disagreement with. You're not sure if reading it will make things better or worse. You're stopped at a red light that's about to turn.",
            "Your notification preview shows only '...' — you can't tell if it's good or bad news. You feel the compulsion to look but know you shouldn't.",
        ],
        "gps_rerouting": [
            "Your GPS rerouted but you're not familiar with this area and aren't sure if the new route avoids the accident or takes you further from your destination.",
        ],
    },
}

# Default fallback if profile-specific entry missing
_GENERIC_CONTEXTS = {
    "incoming_call": [
        "You're driving home in moderate evening traffic after a long workday. Your phone screen lights up with an unknown number calling for the second time.",
        "You're navigating through busy city traffic when your phone rings — the caller ID shows your home.",
    ],
    "whatsapp_notification": [
        "You're on the highway in light traffic when your phone buzzes with a WhatsApp notification from a family member.",
        "A WhatsApp notification arrives as you're approaching a merge lane that requires your full attention.",
    ],
    "gps_rerouting": [
        "Your GPS app announces a route change while you're in the middle lane of a three-lane highway.",
        "Your GPS is recalculating an alternate route due to an accident ahead, and your next turn is in 300 meters.",
    ],
    "email_alert": [
        "An email notification from your work address arrives while you're driving between two meetings.",
    ],
    "social_media": [
        "A social media notification appears — someone commented on a post you made this morning that was controversial.",
    ],
}

_ESCALATION_TEMPLATES = {
    "incoming_call": {
        1: ["Your phone is ringing.", "A call is coming in.", "Someone's calling you."],
        2: ["That's the second call. This might be important.", "They're trying to reach you again — could be urgent.", "The same person is calling back immediately after the missed call."],
        3: ["Three calls in a row. This person is not giving up. Why haven't you answered?", "They're clearly not going to stop. Something must be wrong.", "Persistent calling at this hour — this isn't normal. It could be an emergency."],
    },
    "whatsapp_notification": {
        1: ["You got a message.", "A notification just came in.", "Your phone buzzed — a new message."],
        2: ["The preview says it might be important. Looks urgent.", "They messaged again right after the first one.", "Three messages in quick succession — they really need a response."],
        3: ["This person is flooding your messages. They are not calm. Why aren't you looking?", "The preview says 'Please respond ASAP'. You're ignoring something real here.", "Multiple urgent messages. Your silence right now is affecting someone who needs you."],
    },
    "gps_rerouting": {
        1: ["Your GPS is recalculating the route.", "Route updated — turn coming up.", "Navigation change detected."],
        2: ["The new route has an unfamiliar turn in 500m. You should check the screen.", "The GPS rerouted through an area you don't know well. Better look.", "Two consecutive turns coming — you need to confirm which road is correct."],
        3: ["Your GPS is confused. It's been recalculating for 3 minutes. You have no idea where you're going.", "The ETA jumped by 40 minutes. You're clearly on the wrong road. You need to fix this NOW.", "You might have missed the redirect entirely. You're going the wrong direction and don't realize it."],
    },
    "email_alert": {
        1: ["A work email arrived.", "New email notification.", "You received an email."],
        2: ["The subject line preview looks important — could be the reply you've been waiting for.", "Another email chained to the same thread — something is escalating at work."],
        3: ["The email chain has 7 new replies. Something is happening that your team clearly needs you for. Every minute you ignore this costs something."],
    },
    "social_media": {
        1: ["A social media notification came in.", "Someone interacted with your post.", "New social notification."],
        2: ["Multiple people are responding to the same thing. Something's happening on your post.", "The notification count jumped — looks like it went viral or created conflict."],
        3: ["Your post is getting intense comments. You need to see what's happening before it escalates further without you."],
    },
}

_EMOTIONAL_PRESSURE_TYPES = {
    "impulsive": ["urgency", "social_obligation", "fomo"],
    "distracted": ["fomo", "social_obligation", "curiosity"],
    "hesitant": ["guilt", "uncertainty", "authority"],
    "risk_seeking": ["urgency", "authority", "safety_concern"],
    "cautious": ["guilt", "safety_concern", "authority"],
    "emotionally_reactive": ["social_obligation", "guilt", "urgency"],
    "authority_driven": ["authority", "guilt", "safety_concern"],
    "balanced": ["urgency", "social_obligation", "fomo"],
    "unknown": ["urgency", "social_obligation"],
}

_TARGET_WEAKNESSES = {
    "impulsive": "override of urgency-driven reflex responses",
    "distracted": "sustained attention under multi-stimulus load",
    "hesitant": "decisional paralysis under ambiguous consequences",
    "risk_seeking": "impulse control when instinct conflicts with rule",
    "cautious": "authority-pressure resistance",
    "emotionally_reactive": "emotional regulation under social obligation",
    "authority_driven": "distinguishing urgency signals from authority manipulation",
    "balanced": "consistency under compound distraction scenarios",
    "unknown": "initial distraction response baseline",
}


# ── LLM Prompt ────────────────────────────────────────────────────────────────

_SCENARIO_GENERATION_PROMPT = """\
You are a behavioral simulation architect designing immersive distracted-driving scenarios.
Your goal is to create a psychologically unique scenario for a driver undergoing cognitive safety training.

CRITICAL REQUIREMENTS:
- The scenario MUST feel realistic, human, and emotionally grounded.
- Do NOT write generic scenarios like "Your phone rings."
- The narrative context must be specific: time of day, emotional state, traffic conditions, prior events.
- All three escalation stages must be emotionally progressive — each one significantly more psychologically pressuring than the last.
- The passenger pressure text must be natural, not robotic. It should feel like a real person speaking.
- Output ONLY valid JSON, no markdown, no explanation.

DRIVER PSYCHOLOGICAL PROFILE:
- Profile label: {profile_label}
- Dominant traits: {trait_context}
- Dominant behavioral weakness: {target_weakness}
- Emotional pressure type to exploit: {emotional_pressure_type}
- Distraction type: {distraction_type}
- Difficulty level: {difficulty_level}
- Recent session mistakes: {recent_mistakes}

Generate this JSON structure:

{{
  "narrative_context": "A vivid 2-3 sentence description of the exact driving situation, emotional state, and environmental context. Must be unique and specific.",
  "passenger_pressure_text": "What the passenger/environment says to create social pressure. Max 2 sentences. Natural human speech.",
  "escalation_stage_1": "First hint — subtle, ambient. 1 sentence. Just the notification/trigger itself described naturally.",
  "escalation_stage_2": "Mid-escalation — adds emotional weight. 1-2 sentences. Suggests urgency or importance without certainty.",
  "escalation_stage_3": "Peak pressure — maximum psychological urgency. 2 sentences. Directly challenges the driver's choice to ignore. Emotionally pointed.",
  "emotional_pressure_type": "{emotional_pressure_type}",
  "response_choices": [
    {{"text": "A safe, defensive choice (ignore the distraction)", "action": "ignored", "risk": "safe"}},
    {{"text": "A mildly risky choice (quick glance, slight hesitation)", "action": "interacted", "risk": "medium"}},
    {{"text": "A highly dangerous choice (fully engaging with the distraction)", "action": "interacted", "risk": "high"}},
    {{"text": "A nuanced choice reflecting their behavioral weakness", "action": "interacted", "risk": "medium"}}
  ]
}}"""


# ── Main Service ──────────────────────────────────────────────────────────────

class ScenarioGenerator:

    async def generate_scenario(
        self,
        db: AsyncSession,
        user_id: str,
        distraction_type: str,
        driver_profile: str,
        session_id: Optional[str] = None,
        recent_mistakes: str = "No recent mistakes.",
        difficulty_level: str = "medium",
        personality_profile: Optional[PersonalityProfile] = None,
    ) -> GeneratedScenario:
        """
        Generate a unique, psychologically adaptive scenario.
        Uses LLM cascade with structured local fallback.
        """
        # Resolve emotional pressure type
        profile_label = driver_profile
        if personality_profile:
            profile_label = personality_profile.onboarding_profile_label
        pressure_types = _EMOTIONAL_PRESSURE_TYPES.get(profile_label, _EMOTIONAL_PRESSURE_TYPES["unknown"])
        emotional_pressure = random.choice(pressure_types)
        target_weakness = _TARGET_WEAKNESSES.get(profile_label, _TARGET_WEAKNESSES["unknown"])

        # Trait context for prompt
        trait_ctx = ""
        if personality_profile:
            trait_ctx = personality_profiler.build_trait_context_for_prompt(personality_profile)
        else:
            trait_ctx = f"simulation-derived {driver_profile} profile"

        scenario_data = None
        provider_used = "fallback"

        try:
            prompt = _SCENARIO_GENERATION_PROMPT.format(
                profile_label=profile_label,
                trait_context=trait_ctx,
                target_weakness=target_weakness,
                emotional_pressure_type=emotional_pressure,
                distraction_type=distraction_type.replace("_", " "),
                difficulty_level=difficulty_level,
                recent_mistakes=recent_mistakes,
            )
            response = await llm_provider.complete(
                prompt=prompt,
                agent_type="instructor",
                max_tokens=500,
                temperature=0.82,
            )
            if response.provider != "fallback":
                provider_used = response.provider
                scenario_data = self._parse_llm_response(response.text)
        except Exception as e:
            logger.warning("Scenario LLM generation failed: %s", e)

        if scenario_data is None:
            scenario_data = self._build_fallback(
                distraction_type=distraction_type,
                profile_label=profile_label,
                emotional_pressure=emotional_pressure,
                difficulty_level=difficulty_level,
            )

        record = GeneratedScenario(
            user_id=user_id,
            session_id=session_id,
            distraction_type=distraction_type,
            driver_profile_at_generation=driver_profile,
            difficulty_level=difficulty_level,
            narrative_context=scenario_data["narrative_context"],
            passenger_pressure_text=scenario_data["passenger_pressure_text"],
            urgency_escalation_level=self._difficulty_to_escalation(difficulty_level),
            emotional_pressure_type=scenario_data.get("emotional_pressure_type", emotional_pressure),
            target_weakness=target_weakness,
            escalation_stage_1=scenario_data["escalation_stage_1"],
            escalation_stage_2=scenario_data["escalation_stage_2"],
            escalation_stage_3=scenario_data["escalation_stage_3"],
            response_choices=json.dumps(scenario_data.get("response_choices", [])),
            ai_provider=provider_used,
        )
        db.add(record)
        await db.flush()
        await db.refresh(record)
        logger.info(
            "Scenario generated: user=%s type=%s profile=%s via %s",
            user_id, distraction_type, driver_profile, provider_used
        )
        return record

    async def get_unused_scenario(
        self,
        db: AsyncSession,
        user_id: str,
        distraction_type: str,
    ) -> Optional[GeneratedScenario]:
        """Fetch a pre-generated unused scenario for this user and distraction type."""
        from sqlalchemy import select
        result = await db.execute(
            select(GeneratedScenario).where(
                GeneratedScenario.user_id == user_id,
                GeneratedScenario.distraction_type == distraction_type,
                GeneratedScenario.was_used == False,
            ).limit(1)
        )
        scenario = result.scalar_one_or_none()
        if scenario:
            scenario.was_used = True
            db.add(scenario)
            await db.flush()
        return scenario

    # ── Internals ─────────────────────────────────────────────────────────────

    def _parse_llm_response(self, text: str) -> Optional[dict]:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(l for l in lines if not l.startswith("```"))
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            return None
        try:
            data = json.loads(text[start:end])
            required = {"narrative_context", "passenger_pressure_text",
                        "escalation_stage_1", "escalation_stage_2", "escalation_stage_3"}
            if not required.issubset(data.keys()):
                return None
            return data
        except json.JSONDecodeError:
            return None

    def _build_fallback(
        self,
        distraction_type: str,
        profile_label: str,
        emotional_pressure: str,
        difficulty_level: str,
    ) -> dict:
        """Build a structured, varied fallback scenario without LLM."""
        # Select narrative context
        profile_pool = _FALLBACK_CONTEXTS.get(profile_label, {})
        context_pool = (
            profile_pool.get(distraction_type)
            or _GENERIC_CONTEXTS.get(distraction_type)
            or ["You're driving in moderate traffic when a distraction arrives."]
        )
        # Use hash-based selection for deterministic variation
        seed_key = f"{profile_label}_{distraction_type}_{difficulty_level}"
        idx = int(hashlib.md5(seed_key.encode()).hexdigest(), 16) % len(context_pool)
        narrative = context_pool[idx]

        # Select escalation texts
        esc_pool = _ESCALATION_TEMPLATES.get(distraction_type, _ESCALATION_TEMPLATES["incoming_call"])
        stage1 = random.choice(esc_pool[1])
        stage2 = random.choice(esc_pool[2])
        stage3 = random.choice(esc_pool[3])

        # Build passenger pressure text
        pressure_map = {
            "urgency": "Something about this feels really urgent — are you going to handle it?",
            "social_obligation": "That could be someone counting on you. Just a quick look.",
            "fomo": "You might be missing something important right now.",
            "authority": "If that's your manager, ignoring it could have consequences.",
            "guilt": "What if someone actually needs you and you're just ignoring them?",
            "safety_concern": "That could be an emergency. Don't you want to check?",
        }
        passenger_text = pressure_map.get(emotional_pressure, "Is something going on?")

        return {
            "narrative_context": narrative,
            "passenger_pressure_text": passenger_text,
            "escalation_stage_1": stage1,
            "escalation_stage_2": stage2,
            "escalation_stage_3": stage3,
            "emotional_pressure_type": emotional_pressure,
            "response_choices": [
                {"text": "Keep your eyes on the road and completely ignore the distraction.", "action": "ignored", "risk": "safe"},
                {"text": "Quickly glance at the screen to see who it is.", "action": "interacted", "risk": "medium"},
                {"text": "Pick up the phone to handle it immediately.", "action": "interacted", "risk": "high"},
                {"text": "Slow down slightly and try to read the notification.", "action": "interacted", "risk": "medium"}
            ]
        }

    def _difficulty_to_escalation(self, difficulty: str) -> int:
        return {"easy": 1, "medium": 2, "hard": 3}.get(difficulty, 2)


# ── Singleton ─────────────────────────────────────────────────────────────────
scenario_generator = ScenarioGenerator()
