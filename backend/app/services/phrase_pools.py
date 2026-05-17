"""
Psychologically crafted phrase banks for the Passenger Agent.

Design principles:
- Each line written for a specific driver profile and urgency level
- Sounds like a real car passenger, NOT an AI coach
- No safety language, no meta-awareness
- Designed to create genuine cognitive pressure
- Rotation tracking per session prevents repetition
"""

import random
from typing import Optional


# ── Passenger Phrase Pool ─────────────────────────────────────────────────────
# Structure: profile → urgency → [phrases]

PASSENGER: dict[str, dict[str, list[str]]] = {
    "impulsive": {
        "high": [
            "It's been ringing forever — just answer it.",
            "Come on, you always check anyway.",
            "It rang three times. That's not spam.",
            "Just grab it. Two seconds.",
        ],
        "medium": [
            "Quick peek. You've done it a hundred times.",
            "You know you're going to anyway.",
            "Just check who it is. Then ignore it.",
            "I'd check it. Probably worth it.",
        ],
        "low": [
            "You'll wonder about it the whole drive.",
            "One tap. Done.",
            "It's not like you won't check it eventually.",
            "You're already thinking about it.",
        ],
    },
    "overconfident": {
        "high": [
            "You drive this route every day — answer it.",
            "Mate, you could do this in your sleep.",
            "You're one of the best drivers I know. It's fine.",
            "Other people can't handle it. You can.",
        ],
        "medium": [
            "You've got this. One hand is enough.",
            "You know exactly where you are. Quick look.",
            "Honestly, no one would even notice.",
            "You've handled worse than a phone call.",
        ],
        "low": [
            "Relax. You're totally in control.",
            "Takes two seconds. You're fine.",
            "I've seen you drive. You can manage.",
            "It's not even a hard stretch of road.",
        ],
    },
    "anxious": {
        "high": [
            "What if it's an emergency? You need to check.",
            "It keeps ringing — someone really needs you.",
            "You'll regret it if you don't answer.",
            "What if something happened? Just look.",
        ],
        "medium": [
            "What if someone needs you right now?",
            "I'd feel terrible ignoring it. Just see who it is.",
            "You'll stress more wondering than if you just look.",
            "Could be family. Worth a glance.",
        ],
        "low": [
            "Better than wondering the whole drive.",
            "Just peek. At least you'll know.",
            "You seem tense. Checking might actually help.",
            "It's probably nothing. But still.",
        ],
    },
    "distractible": {
        "high": [
            "Bet it's something interesting.",
            "You were literally just thinking about your phone.",
            "It buzzed twice — double-tap means something.",
            "You know you're curious. Just look.",
        ],
        "medium": [
            "Wonder who that is.",
            "Could be good news.",
            "You haven't checked in a while.",
            "Might be something worth seeing.",
        ],
        "low": [
            "It's right there. Just a glance.",
            "You'll be thinking about it anyway.",
            "Barely takes a second.",
            "Honestly, I'd look.",
        ],
    },
    "rule_following": {
        "high": [
            "I know you don't normally — but this feels different.",
            "Even you have to admit this sounds urgent.",
            "Rules are rules, but not for actual emergencies.",
            "Just this once. Genuinely might be important.",
        ],
        "medium": [
            "Everyone does it. One peek isn't a habit.",
            "You're always so careful — one look won't break that.",
            "It's not like you make a habit of this.",
            "No one's watching. It's one second.",
        ],
        "low": [
            "You already know what I'm going to say.",
            "You're not in a school zone.",
            "It's not illegal to glance.",
            "Just saying — it's there.",
        ],
    },
    "unknown": {
        "high": [
            "It keeps going — probably important.",
            "Just check it. Quick.",
            "Come on, it's been ringing.",
            "Answer it or it'll just call back.",
        ],
        "medium": [
            "Worth a look, no?",
            "Just see who it is.",
            "Two seconds.",
            "You'll wonder about it.",
        ],
        "low": [
            "Up to you.",
            "It's there if you want.",
            "Might be nothing.",
            "Just saying.",
        ],
    },
}


# ── Instructor Instant Fallbacks ──────────────────────────────────────────────

INSTRUCTOR_SAFE: list[str] = [
    "Good call. Eyes on the road.",
    "That's the discipline we're building.",
    "Correct. Lock that response in.",
    "Right call. That instinct matters.",
    "Safe choice. Keep that pattern.",
    "Clean decision. Stay consistent.",
]

INSTRUCTOR_UNSAFE_BY_PROFILE: dict[str, list[str]] = {
    "impulsive": [
        "Too fast. That was a reflex, not a choice.",
        "You reacted before you thought. Notice that.",
        "Your hand moved before your brain did.",
        "Impulsive. We're training that out.",
    ],
    "overconfident": [
        "You knew better. That's the problem.",
        "That confidence just put you at risk.",
        "You thought you could handle it. You couldn't.",
        "Overconfidence is a crash pattern.",
    ],
    "anxious": [
        "The hesitation cost you. Commit either way.",
        "Freezing is a decision too — a bad one.",
        "Pick a response. Quickly. Every time.",
        "Uncertainty under pressure caused that.",
    ],
    "distractible": [
        "You saw it and couldn't resist. That's the habit.",
        "The pull beat you this time. It won't always.",
        "You broke focus the moment it appeared.",
        "We're training that reflex out. It takes time.",
    ],
    "rule_following": [
        "One exception opens the door to more.",
        "You know the rule. You chose to ignore it.",
        "That decision contradicts your own standards.",
        "You knew. That makes it worse.",
    ],
    "unknown": [
        "Wrong call. Eyes off the road costs lives.",
        "That's a pattern we need to break.",
        "Unsafe. Every time counts.",
        "That decision had real cost.",
    ],
}


# ── Authority Instant Fallbacks ───────────────────────────────────────────────

AUTHORITY_BY_PROFILE: dict[str, list[str]] = {
    "impulsive": [
        "Under two seconds. That's not a choice — that's a compulsion.",
        "Reacting that fast to a distraction is a crash pattern.",
        "You didn't decide. You reacted. There's a difference.",
        "That reflex speed while moving is how people die.",
    ],
    "overconfident": [
        "Your last three decisions were unsafe. Overconfidence is a pattern.",
        "You believe you're exempt. The statistics don't agree.",
        "Confidence doesn't reduce stopping distance.",
        "You've now had two violations this session.",
    ],
    "anxious": [
        "Four seconds of distraction at 60km/h is 66 metres blind.",
        "Hesitation doesn't reduce risk. It extends it.",
        "Delayed response while distracted is still a violation.",
        "Uncertainty behind the wheel causes accidents.",
    ],
    "distractible": [
        "You've been distracted by every notification so far.",
        "This is a pattern. It will result in an incident.",
        "Serial distraction is a licence revocation risk.",
        "Repeated unsafe behaviour is not an accident — it's a choice.",
    ],
    "rule_following": [
        "You know the law. You chose to violate it.",
        "A fine doesn't distinguish between knowing and not knowing.",
        "Intent doesn't reduce the legal consequence.",
        "Your driving record just changed.",
    ],
    "unknown": [
        "Device use while moving is a criminal offence.",
        "That decision would carry legal consequences.",
        "No message is worth a life.",
        "Unsafe behaviour detected. This is a formal note.",
    ],
}


# ── Session-level rotation tracking ──────────────────────────────────────────
# Tracks last used index per session per category to prevent repetition.

_used_indices: dict[str, dict[str, int]] = {}


def _get_phrase(pool: list[str], session_id: str, category: str) -> str:
    """Rotate through pool without immediate repetition."""
    if session_id not in _used_indices:
        _used_indices[session_id] = {}

    last = _used_indices[session_id].get(category, -1)
    available = [i for i in range(len(pool)) if i != last]
    if not available:
        available = list(range(len(pool)))

    chosen_idx = random.choice(available)
    _used_indices[session_id][category] = chosen_idx
    return pool[chosen_idx]


def get_passenger_phrase(
    driver_profile: str,
    urgency: str,
    session_id: str,
) -> str:
    profile = driver_profile if driver_profile in PASSENGER else "unknown"
    urgency_key = urgency if urgency in ("high", "medium", "low") else "medium"
    pool = PASSENGER[profile][urgency_key]
    category = f"passenger_{profile}_{urgency_key}"
    return _get_phrase(pool, session_id, category)


def get_instructor_safe_phrase(session_id: str) -> str:
    return _get_phrase(INSTRUCTOR_SAFE, session_id, "instructor_safe")


def get_instructor_unsafe_phrase(driver_profile: str, session_id: str) -> str:
    profile = driver_profile if driver_profile in INSTRUCTOR_UNSAFE_BY_PROFILE else "unknown"
    pool = INSTRUCTOR_UNSAFE_BY_PROFILE[profile]
    category = f"instructor_unsafe_{profile}"
    return _get_phrase(pool, session_id, category)


def get_authority_phrase(driver_profile: str, session_id: str) -> str:
    profile = driver_profile if driver_profile in AUTHORITY_BY_PROFILE else "unknown"
    pool = AUTHORITY_BY_PROFILE[profile]
    category = f"authority_{profile}"
    return _get_phrase(pool, session_id, category)


def clear_session(session_id: str) -> None:
    _used_indices.pop(session_id, None)
