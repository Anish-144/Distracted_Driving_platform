"""
Session Memory — in-session dialogue transcript.

Tracks what each agent has said per session.
Injected into LLM prompts to prevent repetition and enable continuity.
Pure in-memory — no DB, intentionally ephemeral.
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Exchange:
    agent: str      # passenger | instructor | authority
    text: str
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


# Module-level store: session_id → list of exchanges
_store: dict[str, list[Exchange]] = {}
MAX_PER_SESSION = 6


def add(session_id: str, agent: str, text: str) -> None:
    """Record a coaching line for this session."""
    if session_id not in _store:
        _store[session_id] = []
    _store[session_id].append(Exchange(agent=agent, text=text))
    # Keep only the most recent exchanges
    if len(_store[session_id]) > MAX_PER_SESSION:
        _store[session_id] = _store[session_id][-MAX_PER_SESSION:]


def get_recent_text(session_id: str, n: int = 2) -> str:
    """
    Return the last N exchanges as a formatted string for prompt injection.
    Example: '[instructor]: "Good call." | [authority]: "That was a violation."'
    """
    exchanges = _store.get(session_id, [])[-n:]
    if not exchanges:
        return "None yet."
    return " | ".join(f'[{e.agent}]: "{e.text}"' for e in exchanges)


def get_all_said(session_id: str) -> list[str]:
    """Return all phrases said this session (for hard de-duplication)."""
    return [e.text for e in _store.get(session_id, [])]


def has_agent_spoken(session_id: str, agent: str) -> bool:
    return any(e.agent == agent for e in _store.get(session_id, []))


def clear(session_id: str) -> None:
    _store.pop(session_id, None)


def get_session_exchange_count(session_id: str) -> int:
    return len(_store.get(session_id, []))
