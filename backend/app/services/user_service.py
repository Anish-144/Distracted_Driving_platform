"""
User service — CRUD helpers for the User model.
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete, text

from app.models.user import User, ProfileType
from app.services.auth_service import hash_password, verify_password


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Fetch a user by email address."""
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    """Fetch a user by their UUID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    name: str,
    email: str,
    plain_password: str,
    profile_type: ProfileType = ProfileType.UNKNOWN,
) -> User:
    """
    Create and persist a new user.
    
    Returns:
        The newly created User ORM object.
    """
    user = User(
        name=name,
        email=email.lower().strip(),
        hashed_password=hash_password(plain_password),
        profile_type=profile_type,
    )
    db.add(user)
    await db.flush()  # Get the generated ID before commit
    await db.refresh(user)
    return user


async def update_user_profile(
    db: AsyncSession,
    user_id: str,
    profile_type: ProfileType,
) -> Optional[User]:
    """Update the behavioral profile type for a user."""
    user = await get_user_by_id(db, user_id)
    if user is None:
        return None
    user.profile_type = profile_type
    await db.flush()
    await db.refresh(user)
    return user


async def update_core_profile(
    db: AsyncSession,
    user_id: str,
    name: str,
    email: str,
) -> Optional[User]:
    """Update user's name and email. Raises ValueError if email is taken."""
    user = await get_user_by_id(db, user_id)
    if user is None:
        return None
    
    # Check for email conflict
    email = email.lower().strip()
    if email != user.email:
        conflict = await get_user_by_email(db, email)
        if conflict:
            raise ValueError("An account with this email already exists")
    
    user.name = name.strip()
    user.email = email
    await db.flush()
    await db.refresh(user)
    return user


async def update_password(
    db: AsyncSession,
    user_id: str,
    current_password: str,
    new_password: str,
) -> bool:
    """Update a user's password. Raises ValueError if current password is incorrect."""
    user = await get_user_by_id(db, user_id)
    if user is None:
        return False
    
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Incorrect current password")
        
    user.hashed_password = hash_password(new_password)
    await db.flush()
    return True


async def reset_progress(db: AsyncSession, user_id: str) -> bool:
    """
    Reset all training progress for a user without deleting their account.

    Clears (in FK-safe order):
      behavioral_logs      → child of sessions
      behavioral_states    → child of users
      intervention_logs    → child of sessions
      calibration_events   → child of sessions
      events               → child of sessions
      cognitive_reports    → child of sessions
      generated_scenarios  → child of users
      sessions             → child of users
      user_lessons         → child of users
      personality_profiles → child of users

    Preserves:
      users          — account row intact
      user_settings  — preferences preserved
      feedbacks      — feedback history preserved

    Also resets users.profile_type → 'unknown' so behavioral
    classification restarts from scratch on the next session.

    Returns True on success, False if user not found.
    """
    user = await get_user_by_id(db, user_id)
    if user is None:
        return False

    uid = user_id

    # ── 1. Behavioral logs (FK → sessions.id) ─────────────────────────────
    await db.execute(
        text(
            "DELETE FROM behavioral_logs WHERE session_id IN "
            "(SELECT id FROM sessions WHERE user_id = :uid)"
        ),
        {"uid": uid},
    )

    # ── 2. Behavioral states (FK → users.id) ──────────────────────────────
    await db.execute(
        text("DELETE FROM behavioral_states WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 3. Intervention logs (FK → sessions.id) ───────────────────────────
    await db.execute(
        text(
            "DELETE FROM intervention_logs WHERE session_id IN "
            "(SELECT id FROM sessions WHERE user_id = :uid)"
        ),
        {"uid": uid},
    )

    # ── 4. Calibration events (FK → users.id) ──────────────────────────
    await db.execute(
        text("DELETE FROM calibration_events WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 5. Events (FK → sessions.id) ─────────────────────────────────────
    await db.execute(
        text(
            "DELETE FROM events WHERE session_id IN "
            "(SELECT id FROM sessions WHERE user_id = :uid)"
        ),
        {"uid": uid},
    )

    # ── 6. Cognitive reports (FK → sessions.id) ───────────────────────────
    await db.execute(
        text(
            "DELETE FROM cognitive_reports WHERE session_id IN "
            "(SELECT id FROM sessions WHERE user_id = :uid)"
        ),
        {"uid": uid},
    )

    # ── 7. Generated scenarios (FK → users.id) ────────────────────────────
    await db.execute(
        text("DELETE FROM generated_scenarios WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 8. Sessions (FK → users.id) ──────────────────────────────────────
    await db.execute(
        text("DELETE FROM sessions WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 9. User lessons (FK → users.id) ──────────────────────────────────
    await db.execute(
        text("DELETE FROM user_lessons WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 10. Personality profiles (FK → users.id) ──────────────────────────
    await db.execute(
        text("DELETE FROM personality_profiles WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 11. Reset behavioral profile type to unknown ──────────────────────
    await db.execute(
        text("UPDATE users SET profile_type = 'unknown' WHERE id = :uid"),
        {"uid": uid},
    )

    return True


async def delete_account(db: AsyncSession, user_id: str) -> bool:
    """
    Permanently delete a user and all their owned data.

    Deletion order respects FK constraints (children before parents):
      behavioral_logs  → depends on sessions
      behavioral_states → depends on sessions / users
      intervention_logs → depends on sessions
      calibration_events → depends on sessions
      events          → depends on sessions
      sessions        → depends on users
      user_lessons    → depends on users
      generated_scenarios → depends on users
      cognitive_reports → depends on sessions / users (cascade via session)
      personality_profiles → depends on users
      feedbacks       → depends on users
      user_settings   → depends on users
      users           → root
    """
    user = await get_user_by_id(db, user_id)
    if user is None:
        return False

    uid = user_id

    # ── 1. Behavioral logs (FK → sessions.id) ──────────────────────────────
    await db.execute(
        text(
            "DELETE FROM behavioral_logs WHERE session_id IN "
            "(SELECT id FROM sessions WHERE user_id = :uid)"
        ),
        {"uid": uid},
    )

    # ── 2. Behavioral states (FK → users.id) ───────────────────────────────
    await db.execute(
        text("DELETE FROM behavioral_states WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 3. Intervention logs (FK → sessions.id) ────────────────────────────
    await db.execute(
        text(
            "DELETE FROM intervention_logs WHERE session_id IN "
            "(SELECT id FROM sessions WHERE user_id = :uid)"
        ),
        {"uid": uid},
    )

    # ── 4. Calibration events (FK → users.id) ───────────────────────────
    await db.execute(
        text("DELETE FROM calibration_events WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 5. Events (FK → sessions.id) ──────────────────────────────────────
    await db.execute(
        text(
            "DELETE FROM events WHERE session_id IN "
            "(SELECT id FROM sessions WHERE user_id = :uid)"
        ),
        {"uid": uid},
    )

    # ── 6. Cognitive reports (FK → sessions.id) ────────────────────────────
    await db.execute(
        text(
            "DELETE FROM cognitive_reports WHERE session_id IN "
            "(SELECT id FROM sessions WHERE user_id = :uid)"
        ),
        {"uid": uid},
    )

    # ── 7. Generated scenarios (FK → users.id) ─────────────────────────────
    await db.execute(
        text("DELETE FROM generated_scenarios WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 8. Sessions (FK → users.id) ────────────────────────────────────────
    await db.execute(
        text("DELETE FROM sessions WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 9. User lessons (FK → users.id) ────────────────────────────────────
    await db.execute(
        text("DELETE FROM user_lessons WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 10. Personality profiles (FK → users.id) ───────────────────────────
    await db.execute(
        text("DELETE FROM personality_profiles WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 11. Feedback (FK → users.id) ───────────────────────────────────────
    await db.execute(
        text("DELETE FROM feedbacks WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 12. User settings (FK → users.id) ──────────────────────────────────
    await db.execute(
        text("DELETE FROM user_settings WHERE user_id = :uid"),
        {"uid": uid},
    )

    # ── 13. User row ───────────────────────────────────────────────────────
    await db.execute(
        text("DELETE FROM users WHERE id = :uid"),
        {"uid": uid},
    )

    return True

