"""Profile updates, profile photo URL, and user activity history."""

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.user import User
from app.models.user_history import (
    HISTORY_PROFILE_PHOTO_UPDATE,
    HISTORY_PROFILE_UPDATE,
    HISTORY_RESTAURANT_VIEW,
    UserHistory,
)
from app.schemas.history_schema import UserHistoryEntryResponse, UserHistoryListResponse
from app.schemas.restaurant_schema import RestaurantSummary
from app.schemas.user_schema import ProfilePhotoUrlBody, UserResponse, UserUpdate


def get_profile(user: User) -> UserResponse:
    return UserResponse.model_validate(user)


def record_history(
    db: Session,
    *,
    user_id: int,
    action: str,
    restaurant_id: int | None = None,
) -> None:
    """Append one history row (caller commits)."""
    db.add(
        UserHistory(
            user_id=user_id,
            action=action,
            restaurant_id=restaurant_id,
        )
    )


def record_restaurant_view(db: Session, *, user_id: int, restaurant_id: int) -> None:
    """Call from restaurant detail routes when a user opens a listing (Yelp-style history)."""
    record_history(
        db,
        user_id=user_id,
        action=HISTORY_RESTAURANT_VIEW,
        restaurant_id=restaurant_id,
    )


def update_profile(db: Session, user: User, body: UserUpdate) -> UserResponse:
    data = body.model_dump(exclude_unset=True)
    if not data:
        return UserResponse.model_validate(user)

    changed = False
    for key, value in data.items():
        if getattr(user, key) != value:
            setattr(user, key, value)
            changed = True

    if changed:
        record_history(db, user_id=user.id, action=HISTORY_PROFILE_UPDATE)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise AppHTTPException(status_code=409, detail="Email is already in use.") from None
        db.refresh(user)
    return UserResponse.model_validate(user)


def set_profile_photo_url(db: Session, user: User, body: ProfilePhotoUrlBody) -> UserResponse:
    user.avatar_url = body.avatar_url.strip()
    record_history(db, user_id=user.id, action=HISTORY_PROFILE_PHOTO_UPDATE)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


def list_history(
    db: Session,
    user_id: int,
    *,
    limit: int = 100,
    offset: int = 0,
) -> UserHistoryListResponse:
    total = db.scalar(
        select(func.count()).select_from(UserHistory).where(UserHistory.user_id == user_id)
    )
    if total is None:
        total = 0

    stmt = (
        select(UserHistory)
        .where(UserHistory.user_id == user_id)
        .order_by(UserHistory.viewed_at.desc())
        .offset(offset)
        .limit(limit)
        .options(selectinload(UserHistory.restaurant))
    )
    rows = list(db.scalars(stmt).all())

    items: list[UserHistoryEntryResponse] = []
    for entry in rows:
        rest = None
        if entry.restaurant is not None:
            rest = RestaurantSummary.model_validate(entry.restaurant)
        items.append(
            UserHistoryEntryResponse(
                id=entry.id,
                user_id=entry.user_id,
                action=entry.action,
                restaurant_id=entry.restaurant_id,
                viewed_at=entry.viewed_at,
                restaurant=rest,
            )
        )

    return UserHistoryListResponse(items=items, total=total)
