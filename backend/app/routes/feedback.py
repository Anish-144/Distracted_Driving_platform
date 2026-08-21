"""
Feedback API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional, List
import uuid
import os
import aiofiles
from pathlib import Path

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.models.feedback import Feedback, FeedbackAttachment, FeedbackNote, FeedbackType, FeedbackStatus, FeedbackPriority, AIFeedbackInsightsCache
from app.schemas.feedback import (
    FeedbackCreate, FeedbackRead, FeedbackAdminRead, 
    FeedbackStatusUpdate, FeedbackNoteBase, FeedbackListResponse, FeedbackAnalyticsResponse
)
import mimetypes
try:
    import magic
except (ImportError, Exception):
    magic = None
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

UPLOAD_DIR = Path("uploads/feedback")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Admin dependency
async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("", response_model=FeedbackRead)
async def submit_feedback(
    # Because we support file uploads, we use Form data instead of JSON body
    type: FeedbackType = Form(...),
    rating: Optional[int] = Form(None),
    comment: str = Form(...),
    page_url: Optional[str] = Form(None),
    browser: Optional[str] = Form(None),
    device_type: Optional[str] = Form(None),
    screen_size: Optional[str] = Form(None),
    user_agent: Optional[str] = Form(None),
    app_version: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    current_user: Optional[User] = Depends(get_current_user), # Allow anonymous feedback if desired, or make required
    db: AsyncSession = Depends(get_db)
):
    # Sanitize and validate
    if len(comment) > 5000:
        raise HTTPException(status_code=400, detail="Comment too long")

    new_feedback = Feedback(
        user_id=current_user.id if current_user else None,
        type=type,
        rating=rating,
        comment=comment,
        page_url=page_url,
        browser=browser,
        device_type=device_type,
        screen_size=screen_size,
        user_agent=user_agent,
        app_version=app_version,
        session_id=session_id
    )
    
    db.add(new_feedback)
    await db.flush() # get ID

    ALLOWED_MIME_TYPES = {
        "image/jpeg": 10 * 1024 * 1024, # 10 MB
        "image/png": 10 * 1024 * 1024,
        "image/webp": 10 * 1024 * 1024,
        "video/mp4": 50 * 1024 * 1024, # 50 MB
        "video/webm": 50 * 1024 * 1024
    }

    # Handle attachments
    for file in files:
        if file.filename:
            content = await file.read()
            size = len(content)
            
            # Magic byte verification with fallback if libmagic is unavailable
            actual_mime = None
            if magic is not None:
                try:
                    actual_mime = magic.from_buffer(content[:2048], mime=True)
                except Exception:
                    actual_mime = None
            if not actual_mime:
                actual_mime = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
            
            if actual_mime not in ALLOWED_MIME_TYPES:
                continue # Skip invalid files
            if size > ALLOWED_MIME_TYPES[actual_mime]:
                continue # Skip oversized files
            
            ext = file.filename.split('.')[-1].lower()
            if ext not in ['png', 'jpg', 'jpeg', 'webp', 'mp4', 'webm']:
                continue
                
            safe_filename = f"{uuid.uuid4()}.{ext}"
            file_path = UPLOAD_DIR / safe_filename
            
            async with aiofiles.open(file_path, 'wb') as out_file:
                await out_file.write(content)
                
            attachment = FeedbackAttachment(
                feedback_id=new_feedback.id,
                file_path=f"/uploads/feedback/{safe_filename}",
                file_type=actual_mime
            )
            db.add(attachment)

    await db.commit()
    await db.refresh(new_feedback)

    # --- Append to local JSON ---
    json_file_path = "local_feedback.json"
    try:
        import json
        from datetime import datetime
        
        feedback_data = {
            "id": str(new_feedback.id),
            "type": new_feedback.type.value if hasattr(new_feedback.type, 'value') else str(new_feedback.type),
            "rating": new_feedback.rating,
            "comment": new_feedback.comment,
            "user_id": str(new_feedback.user_id) if new_feedback.user_id else "Anonymous",
            "created_at": new_feedback.created_at.isoformat() if new_feedback.created_at else datetime.utcnow().isoformat()
        }
        
        existing_data = []
        if os.path.isfile(json_file_path):
            async with aiofiles.open(json_file_path, mode='r', encoding='utf-8') as f:
                content = await f.read()
                if content.strip():
                    try:
                        existing_data = json.loads(content)
                    except json.JSONDecodeError:
                        existing_data = []
        
        existing_data.append(feedback_data)
        
        async with aiofiles.open(json_file_path, mode='w', encoding='utf-8') as f:
            await f.write(json.dumps(existing_data, indent=4))
            
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to write to local feedback JSON: {e}")

    return new_feedback


@router.get("/admin", response_model=FeedbackListResponse)
async def list_feedback(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[FeedbackStatus] = None,
    type: Optional[FeedbackType] = None,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Feedback)
    if status:
        query = query.where(Feedback.status == status)
    if type:
        query = query.where(Feedback.type == type)
        
    query = query.order_by(desc(Feedback.created_at))
    
    # Count total
    count_query = select(func.count(Feedback.id))
    if status:
        count_query = count_query.where(Feedback.status == status)
    if type:
        count_query = count_query.where(Feedback.type == type)
        
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    result = await db.execute(query.offset(offset).limit(limit))
    items = result.scalars().all()
    
    return FeedbackListResponse(
        items=items,
        total_count=total,
        limit=limit,
        offset=offset
    )


@router.get("/admin/analytics", response_model=FeedbackAnalyticsResponse)
async def get_analytics(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Total
    total = await db.scalar(select(func.count(Feedback.id)))
    
    # Statuses
    open_issues = await db.scalar(select(func.count(Feedback.id)).where(Feedback.status == FeedbackStatus.OPEN))
    resolved_issues = await db.scalar(select(func.count(Feedback.id)).where(Feedback.status == FeedbackStatus.RESOLVED))
    
    # Avg rating
    avg_rating = await db.scalar(select(func.avg(Feedback.rating)).where(Feedback.rating.isnot(None)))
    
    # Types
    type_result = await db.execute(select(Feedback.type, func.count(Feedback.id)).group_by(Feedback.type))
    type_counts = {t.value: count for t, count in type_result.all()}
    
    # Statuses dict
    status_result = await db.execute(select(Feedback.status, func.count(Feedback.id)).group_by(Feedback.status))
    status_counts = {s.value: count for s, count in status_result.all()}
    
    return FeedbackAnalyticsResponse(
        total_feedback=total or 0,
        open_issues=open_issues or 0,
        resolved_issues=resolved_issues or 0,
        avg_rating=float(avg_rating or 0),
        type_counts=type_counts,
        status_counts=status_counts
    )


async def _generate_ai_insights(db: AsyncSession):
    from app.services.ai_coach import llm_provider
    
    result = await db.execute(
        select(Feedback)
        .where(Feedback.status == FeedbackStatus.OPEN)
        .order_by(desc(Feedback.created_at))
        .limit(50)
    )
    feedbacks = result.scalars().all()
    
    if not feedbacks:
        return {"summary": "No open feedback to analyze.", "trends": []}, 0
        
    text_corpus = "\\n".join([f"- [{f.type.value.upper()}] {f.comment}" for f in feedbacks])
    prompt = f"Analyze the following user feedback and summarize key trends, recurring bugs, and feature requests:\\n\\n{text_corpus}"
    
    try:
        llm_resp = await llm_provider.complete(
            prompt=prompt,
            agent_type="instructor",
            max_tokens=500
        )
        return {"insights": llm_resp.text, "analyzed_count": len(feedbacks)}, len(feedbacks)
    except Exception as e:
        return {"error": str(e)}, 0


@router.get("/admin/ai-insights")
async def get_ai_insights(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Check cache
    cache = await db.scalar(
        select(AIFeedbackInsightsCache)
        .where(AIFeedbackInsightsCache.expires_at > func.now())
        .order_by(desc(AIFeedbackInsightsCache.created_at))
        .limit(1)
    )
    
    if cache:
        return {
            "insights": cache.insights_text,
            "analyzed_count": cache.analyzed_count,
            "cached_at": cache.created_at.isoformat()
        }

    # Generate new cache
    data, count = await _generate_ai_insights(db)
    if "error" in data:
        return data
        
    if "insights" in data:
        new_cache = AIFeedbackInsightsCache(
            insights_text=data["insights"],
            analyzed_count=count,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        db.add(new_cache)
        await db.commit()
        await db.refresh(new_cache)
        
        return {
            "insights": new_cache.insights_text,
            "analyzed_count": new_cache.analyzed_count,
            "cached_at": new_cache.created_at.isoformat()
        }
    
    return data

@router.post("/admin/ai-insights/regenerate")
async def regenerate_ai_insights(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    data, count = await _generate_ai_insights(db)
    if "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
        
    if "insights" in data:
        # Expire old caches
        await db.execute(
            AIFeedbackInsightsCache.__table__.update().values(expires_at=func.now())
        )
        
        new_cache = AIFeedbackInsightsCache(
            insights_text=data["insights"],
            analyzed_count=count,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        db.add(new_cache)
        await db.commit()
        await db.refresh(new_cache)
        
        return {
            "insights": new_cache.insights_text,
            "analyzed_count": new_cache.analyzed_count,
            "cached_at": new_cache.created_at.isoformat()
        }
    
    return data


@router.get("/admin/{id}", response_model=FeedbackAdminRead)
async def get_feedback_detail(
    id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    feedback = await db.get(Feedback, id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return feedback


@router.patch("/admin/{id}", response_model=FeedbackAdminRead)
async def update_feedback_status(
    id: str,
    payload: FeedbackStatusUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    feedback = await db.get(Feedback, id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    if payload.status:
        feedback.status = payload.status
    if payload.priority:
        feedback.priority = payload.priority
        
    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.post("/admin/{id}/notes", response_model=FeedbackAdminRead)
async def add_feedback_note(
    id: str,
    payload: FeedbackNoteBase,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    feedback = await db.get(Feedback, id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    note = FeedbackNote(
        feedback_id=id,
        admin_id=current_admin.id,
        content=payload.content
    )
    db.add(note)
    await db.commit()
    await db.refresh(feedback)
    return feedback


