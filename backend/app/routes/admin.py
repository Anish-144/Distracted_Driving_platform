from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, text
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, timezone
import json

from app.database import get_db
from app.routes.auth import get_current_admin
from app.models.user import User, ProfileType
from app.models.session import Session
from app.models.user_lesson import UserLesson
from app.models.feedback import Feedback, FeedbackStatus
from app.models.behavioral_state import BehavioralState
from app.models.admin import AdminPlatformInsightsCache
from app.services.ai_coach import llm_provider

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/kpis")
async def get_platform_kpis(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    
    total_users = await db.scalar(select(func.count(User.id)))
    active_users_7d = await db.scalar(select(func.count(User.id)).where(User.updated_at >= seven_days_ago))
    active_users_30d = await db.scalar(select(func.count(User.id)).where(User.updated_at >= thirty_days_ago))
    
    total_sessions = await db.scalar(select(func.count(Session.id)))
    total_lessons = await db.scalar(select(func.count(UserLesson.id)).where(UserLesson.completed == True))
    
    avg_score = await db.scalar(select(func.avg(Session.score)))
    
    # Calculate avg reaction time across all behavioral states
    avg_reaction = await db.scalar(select(func.avg(BehavioralState.avg_reaction_time)).where(BehavioralState.avg_reaction_time > 0))
    
    open_feedback = await db.scalar(select(func.count(Feedback.id)).where(Feedback.status == FeedbackStatus.OPEN))
    resolved_feedback = await db.scalar(select(func.count(Feedback.id)).where(Feedback.status == FeedbackStatus.RESOLVED))
    
    avg_feedback_rating = await db.scalar(select(func.avg(Feedback.rating)).where(Feedback.rating.isnot(None)))

    return {
        "total_users": total_users or 0,
        "active_users_7d": active_users_7d or 0,
        "active_users_30d": active_users_30d or 0,
        "total_sessions_completed": total_sessions or 0,
        "total_lessons_completed": total_lessons or 0,
        "average_safety_score": round(float(avg_score or 0), 2),
        "average_reaction_time": round(float(avg_reaction or 0), 2),
        "open_feedback_issues": open_feedback or 0,
        "resolved_feedback_issues": resolved_feedback or 0,
        "average_feedback_rating": round(float(avg_feedback_rating or 0), 1)
    }


@router.get("/leaderboard")
async def get_leaderboard(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Top Performing Drivers
    top_drivers_query = (
        select(User.id, User.name, func.avg(Session.score).label("avg_score"), func.count(Session.id).label("session_count"))
        .join(Session, User.id == Session.user_id)
        .group_by(User.id)
        .having(func.count(Session.id) > 0)
        .order_by(desc("avg_score"))
        .limit(10)
    )
    top_result = await db.execute(top_drivers_query)
    
    top_drivers = []
    for rank, row in enumerate(top_result.all(), start=1):
        top_drivers.append({
            "rank": rank,
            "id": row.id,
            "name": row.name,
            "average_score": round(float(row.avg_score), 2),
            "sessions_completed": row.session_count
        })

    # Highest Risk Drivers
    risk_drivers_query = (
        select(
            User.id, 
            User.name, 
            User.profile_type, 
            func.avg(Session.score).label("avg_score"), 
            BehavioralState.unsafe_decisions,
            BehavioralState.consecutive_mistakes
        )
        .join(Session, User.id == Session.user_id)
        .join(BehavioralState, User.id == BehavioralState.user_id)
        .group_by(User.id, BehavioralState.id)
        .order_by(desc(BehavioralState.unsafe_decisions))
        .limit(10)
    )
    risk_result = await db.execute(risk_drivers_query)
    
    risk_drivers = []
    for row in risk_result.all():
        risk_drivers.append({
            "id": row.id,
            "name": row.name,
            "risk_classification": row.profile_type.value,
            "average_score": round(float(row.avg_score or 0), 2),
            "intervention_count": row.unsafe_decisions + row.consecutive_mistakes
        })

    return {
        "top_drivers": top_drivers,
        "high_risk_drivers": risk_drivers
    }


@router.get("/behavioral-distribution")
async def get_behavioral_distribution(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Breakdown of ProfileType
    query = select(User.profile_type, func.count(User.id)).group_by(User.profile_type)
    result = await db.execute(query)
    
    total = 0
    counts = {}
    for pt, count in result.all():
        val = pt.value if hasattr(pt, 'value') else str(pt)
        counts[val] = count
        total += count
        
    distribution = []
    for k, v in counts.items():
        if k == "unknown":
            continue
        distribution.append({
            "name": k.replace("_", " ").title(),
            "count": v,
            "percentage": round((v / total) * 100, 1) if total > 0 else 0
        })
        
    return {"distribution": distribution}


@router.get("/training-effectiveness")
async def get_training_effectiveness(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # This is an approximation. A proper implementation would find first X vs last X per user.
    # We will just fetch overall lesson completion vs session improvement.
    generated_lessons = await db.scalar(select(func.count(UserLesson.id)))
    completed_lessons = await db.scalar(select(func.count(UserLesson.id)).where(UserLesson.completed == True))
    
    completion_rate = round((completed_lessons / generated_lessons) * 100, 1) if generated_lessons else 0

    
    # Calculate average score improvement
    # We will fetch all sessions ordered by start_time for all users
    # Then for each user with >= 2 sessions, compare first session vs last session
    sessions_result = await db.execute(
        select(Session.user_id, Session.score)
        .order_by(Session.user_id, Session.start_time)
    )
    
    user_sessions = {}
    for user_id, score in sessions_result.all():
        if user_id not in user_sessions:
            user_sessions[user_id] = []
        user_sessions[user_id].append(score)
        
    before_scores = []
    after_scores = []
    
    for uid, scores in user_sessions.items():
        if len(scores) >= 2:
            # simple metric: avg of first half vs avg of second half
            mid = max(1, len(scores) // 2)
            first_half = scores[:mid]
            second_half = scores[-mid:]
            before_scores.append(sum(first_half) / len(first_half))
            after_scores.append(sum(second_half) / len(second_half))
            
    avg_before = sum(before_scores) / len(before_scores) if before_scores else 0.0
    avg_after = sum(after_scores) / len(after_scores) if after_scores else 0.0
    improvement = ((avg_after - avg_before) / avg_before * 100) if avg_before > 0 else 0.0

    return {
        "average_score_before_lessons": round(avg_before, 2),
        "average_score_after_lessons": round(avg_after, 2),
        "improvement_percentage": round(improvement, 2),
        "lesson_completion_rate": completion_rate,
        "generated_lessons": generated_lessons or 0,
        "completed_lessons": completed_lessons or 0
    }

@router.get("/ai-insights")
async def get_platform_ai_insights(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Check cache
    cache = await db.scalar(
        select(AdminPlatformInsightsCache)
        .where(AdminPlatformInsightsCache.expires_at > func.now())
        .order_by(desc(AdminPlatformInsightsCache.created_at))
        .limit(1)
    )
    
    if cache:
        return {
            "insights": cache.insights_text,
            "cached_at": cache.created_at.isoformat()
        }

    # Generate new insights based on KPI data
    kpis = await get_platform_kpis(current_admin, db)
    dist = await get_behavioral_distribution(current_admin, db)
    leaders = await get_leaderboard(current_admin, db)
    
    prompt = f"""
    Analyze the following platform telemetry and generate an Executive Insight Report:
    KPIs: {json.dumps(kpis)}
    Behavioral Distribution: {json.dumps(dist)}
    Highest Risk Drivers: {len(leaders["high_risk_drivers"])} identified
    
    Provide 3 paragraphs:
    1. Overall Platform Health & User Engagement
    2. Primary Behavioral Weaknesses detected
    3. Actionable Recommendations for new lessons
    """
    
    try:
        llm_resp = await llm_provider.complete(prompt=prompt, agent_type="instructor", max_tokens=600)
        insights_text = llm_resp.text
        
        new_cache = AdminPlatformInsightsCache(
            insights_text=insights_text,
            analyzed_users_count=kpis["total_users"],
            analyzed_sessions_count=kpis["total_sessions_completed"],
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        db.add(new_cache)
        await db.commit()
        await db.refresh(new_cache)
        
        return {
            "insights": insights_text,
            "cached_at": new_cache.created_at.isoformat()
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/ai-insights/regenerate")
async def regenerate_platform_ai_insights(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Expire old caches
    await db.execute(
        AdminPlatformInsightsCache.__table__.update().values(expires_at=func.now())
    )
    await db.commit()
    return await get_platform_ai_insights(current_admin, db)
