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
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must not exceed 128 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name cannot be empty")
        if len(stripped) > 100:
            raise ValueError("Name must not exceed 100 characters")
        return stripped


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
        is_admin=user.is_admin,
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with email + password; returns JWT token.

    Timing-safe: a dummy bcrypt verify is performed even when the user is not
    found, so the response time is constant regardless of whether the email
    exists. This prevents user-enumeration via timing side-channels.
    """
    user = await user_service.get_user_by_email(db, form_data.username)

    # Constant-time check: always run bcrypt even for unknown users
    # to prevent timing-based user enumeration.
    _DUMMY_HASH = "$2b$12$invaliddummyhashfortimingprotectionXXXXXXXXXXXXXXXXXXX"
    candidate_hash = user.hashed_password if user else _DUMMY_HASH
    password_ok = auth_service.verify_password(form_data.password, candidate_hash)

    if user is None or not password_ok:
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
        is_admin=user.is_admin,
    )


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
