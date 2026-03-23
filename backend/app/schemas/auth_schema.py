from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole
from app.schemas.user_schema import UserResponse


class UserSignupRequest(BaseModel):
    """Regular diner account (role is always `user`)."""

    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=120)


class OwnerSignupRequest(BaseModel):
    """Restaurant owner account (role is always `owner`)."""

    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """Returned after signup or login: JWT plus public user profile (no password hash)."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: str
    role: UserRole | None = None
    exp: int | None = None
