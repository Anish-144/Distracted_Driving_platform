"""
Auth routes — user registration and login.

Endpoints:
  POST /api/auth/register  — Create new user account
  POST /api/auth/login     — Authenticate user, return JWT
  GET  /api/auth/me        — Get current user info (protected)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, field_validator

from app.database import get_db
from app.models.user import User
from app.services import auth_service, user_service

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


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    profile_type: str
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


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and return a JWT token immediately."""
    # Check for existing email
    existing = await user_service.get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = await user_service.create_user(
        db, name=request.name, email=request.email, plain_password=request.password
    )

    token = auth_service.create_access_token({"sub": user.id})
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
        profile_type=user.profile_type.value,
    )


@router.post("/login", response_model=LoginResponse)
async def login(
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
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
        profile_type=user.profile_type.value,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        profile_type=current_user.profile_type.value,
        created_at=current_user.created_at.isoformat(),
    )
