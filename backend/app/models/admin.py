"""
Admin models — stores administrative specific data like platform AI insights caching.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AdminPlatformInsightsCache(Base):
    __tablename__ = "admin_platform_insights_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    insights_text: Mapped[str] = mapped_column(Text, nullable=False)
    analyzed_users_count: Mapped[int] = mapped_column(Integer, nullable=False)
    analyzed_sessions_count: Mapped[int] = mapped_column(Integer, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def __repr__(self) -> str:
        return f"<AdminPlatformInsightsCache id={self.id} expires={self.expires_at}>"
