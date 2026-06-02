from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, update
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.routes.auth import get_current_admin
from app.models.user import User, ProfileType
from app.models.session import Session

router = APIRouter(prefix="/api/admin/users", tags=["admin_users"])


@router.get("")
async def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    profile_type: Optional[ProfileType] = None,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    
    if search:
        query = query.where(or_(
            User.email.ilike(f"%{search}%"),
            User.name.ilike(f"%{search}%")
        ))
        
    if profile_type:
        query = query.where(User.profile_type == profile_type)
        
    query = query.order_by(desc(User.created_at))
    
    # Count total
    count_query = select(func.count(User.id))
    if search:
        count_query = count_query.where(or_(
            User.email.ilike(f"%{search}%"),
            User.name.ilike(f"%{search}%")
        ))
    if profile_type:
        count_query = count_query.where(User.profile_type == profile_type)
        
    total = await db.scalar(count_query)
    
    # Execute paginated
    result = await db.execute(query.offset(offset).limit(limit))
    users = result.scalars().all()
    
    # We need to enrich users with session count, avg score
    enriched = []
    for u in users:
        # Fast query for aggregates
        agg = await db.execute(
            select(func.count(Session.id), func.avg(Session.score))
            .where(Session.user_id == u.id)
        )
        s_count, s_score = agg.first()
        
        enriched.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "is_admin": u.is_admin,
            "profile_type": u.profile_type.value,
            "sessions": s_count or 0,
            "average_score": round(float(s_score or 0), 2),
            "last_active": u.updated_at.isoformat()
        })
        
    return {
        "items": enriched,
        "total_count": total or 0,
        "limit": limit,
        "offset": offset
    }


@router.get("/{id}")
async def get_user_detail(
    id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    u = await db.get(User, id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
        
    agg = await db.execute(
        select(func.count(Session.id), func.avg(Session.score))
        .where(Session.user_id == id)
    )
    s_count, s_score = agg.first()
    
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "is_admin": u.is_admin,
        "profile_type": u.profile_type.value,
        "created_at": u.created_at.isoformat(),
        "sessions": s_count or 0,
        "average_score": round(float(s_score or 0), 2)
    }


@router.patch("/{id}/role")
async def update_user_role(
    id: str,
    is_admin: bool,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    if id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
        
    user = await db.get(User, id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_admin = is_admin
    await db.commit()
    
    return {"message": "Role updated successfully", "is_admin": is_admin}
