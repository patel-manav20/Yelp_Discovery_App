"""Signup, login, and user lookup for authentication."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppHTTPException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth_schema import AuthResponse
from app.schemas.user_schema import UserResponse


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(User.email == normalize_email(email))
    return db.execute(stmt).scalar_one_or_none()


def _issue_auth_response(user: User) -> AuthResponse:
    token = create_access_token(
        user.id,
        extra_claims={"role": user.role.value},
    )
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


def signup_user(db: Session, *, email: str, password: str, display_name: str, role: UserRole) -> AuthResponse:
    if get_user_by_email(db, email):
        raise AppHTTPException(status_code=409, detail="An account with this email already exists")

    user = User(
        email=normalize_email(email),
        password_hash=hash_password(password),
        display_name=display_name.strip(),
        role=role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppHTTPException(status_code=409, detail="An account with this email already exists") from None
    db.refresh(user)
    return _issue_auth_response(user)


def login_user(db: Session, *, email: str, password: str) -> AuthResponse:
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        raise AppHTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise AppHTTPException(status_code=403, detail="This account is disabled")

    return _issue_auth_response(user)
