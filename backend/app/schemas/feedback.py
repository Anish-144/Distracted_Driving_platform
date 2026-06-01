from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from app.models.feedback import FeedbackType, FeedbackStatus, FeedbackPriority

class FeedbackAttachmentBase(BaseModel):
    file_path: str
    file_type: str

class FeedbackAttachmentRead(FeedbackAttachmentBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class FeedbackNoteBase(BaseModel):
    content: str = Field(..., min_length=1)

class FeedbackNoteRead(FeedbackNoteBase):
    id: str
    admin_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class FeedbackBase(BaseModel):
    type: FeedbackType
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: str = Field(..., min_length=1, max_length=5000)
    
    # Metadata
    page_url: Optional[str] = None
    browser: Optional[str] = None
    device_type: Optional[str] = None
    screen_size: Optional[str] = None
    user_agent: Optional[str] = None
    app_version: Optional[str] = None
    session_id: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackRead(FeedbackBase):
    id: str
    user_id: Optional[str]
    status: FeedbackStatus
    priority: FeedbackPriority
    created_at: datetime
    updated_at: datetime
    attachments: List[FeedbackAttachmentRead] = []

    class Config:
        from_attributes = True

class FeedbackAdminRead(FeedbackRead):
    notes: List[FeedbackNoteRead] = []

class FeedbackStatusUpdate(BaseModel):
    status: Optional[FeedbackStatus] = None
    priority: Optional[FeedbackPriority] = None

class FeedbackListResponse(BaseModel):
    items: List[FeedbackAdminRead]
    total: int
    page: int
    size: int
    
class FeedbackAnalyticsResponse(BaseModel):
    total_feedback: int
    open_issues: int
    resolved_issues: int
    avg_rating: float
    type_counts: dict
    status_counts: dict
