"""
Auth routes — user registration and login.

Endpoints:
  POST /api/auth/register  — Create new user account
  POST /api/auth/login     — Authenticate user, return JWT
  GET  /api/auth/me        — Get current user info (protected)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, field_validator

from app.database import get_db
from app.models.user import User
from app.services import auth_service, user_service
from app.main import limiter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    email: str
    profile_type: str
    is_admin: bool


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    profile_type: str
    is_admin: bool
    created_at: str


# ─── Dependency: current user from JWT ──────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = auth_service.extract_user_id(token)
    if user_id is None:
        raise credentials_exception

    user = await user_service.get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, register_data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and return a JWT token immediately."""
    # Check for existing email
    existing = await user_service.get_user_by_email(db, register_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = await user_service.create_user(
        db, name=register_data.name, email=register_data.email, plain_password=register_data.password
    )

    token = auth_service.create_access_token({"sub": user.id})
    response_data = LoginResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
        profile_type=user.profile_type.value,
        is_admin=user.is_admin,
    )
    
    response = JSONResponse(content=response_data.model_dump(), status_code=status.HTTP_201_CREATED)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/",
    )
    return response


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with email + password; returns JWT token."""
    user = await user_service.get_user_by_email(db, form_data.username)
    if user is None or not auth_service.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_service.create_access_token({"sub": user.id})
    response_data = LoginResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
        profile_type=user.profile_type.value,
        is_admin=user.is_admin,
    )
    
    response = JSONResponse(content=response_data.model_dump())
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/",
    )
    return response

@router.post("/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token")
    return response

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        profile_type=current_user.profile_type.value,
        is_admin=current_user.is_admin,
        created_at=current_user.created_at.isoformat(),
    )
