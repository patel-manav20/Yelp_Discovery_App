"""Shared FastAPI dependencies (DB session, JWT user)."""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import PyJWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User, UserRole

http_bearer = HTTPBearer(auto_error=False)


def get_current_user_optional(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(http_bearer)],
) -> Optional[User]:
    """Load the User row from a valid Bearer token, or None if missing/invalid/inactive."""
    if credentials is None or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        sub = payload.get("sub")
        if sub is None:
            return None
        user_id = int(sub)
    except (PyJWTError, ValueError, TypeError):
        return None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        return None
    return user


def get_current_user(
    user: Annotated[Optional[User], Depends(get_current_user_optional)],
) -> User:
    """Same as optional, but raises 401 when not logged in."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_user_id(user: Annotated[User, Depends(get_current_user)]) -> int:
    """Backward-compatible: returns user id for routes that only need the id."""
    return user.id


def require_owner(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Same as get_current_user, but raises 403 if role is not owner."""
    if user.role != UserRole.owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner role required.",
        )
    return user


DbSession = Annotated[Session, Depends(get_db)]
