"""Auth endpoints: signup (user / owner), login, current user."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth_schema import (
    AuthResponse,
    LoginRequest,
    OwnerSignupRequest,
    UserSignupRequest,
)
from app.schemas.user_schema import UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Sign up as a diner",
    description="Creates a **user** account and returns a JWT plus profile.",
)
def signup(body: UserSignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return auth_service.signup_user(
        db,
        email=body.email,
        password=body.password,
        display_name=body.display_name,
        role=UserRole.user,
    )


@router.post(
    "/owner-signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Sign up as a restaurant owner",
    description="Creates an **owner** account and returns a JWT plus profile.",
)
def owner_signup(body: OwnerSignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return auth_service.signup_user(
        db,
        email=body.email,
        password=body.password,
        display_name=body.display_name,
        role=UserRole.owner,
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Log in",
    description="Returns a JWT and user profile if credentials are valid.",
)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return auth_service.login_user(db, email=body.email, password=body.password)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Current user",
    description="Requires `Authorization: Bearer <token>`. Returns the logged-in user (no password hash).",
)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(user)
