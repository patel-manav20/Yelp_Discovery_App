"""Dining preferences: one row per user, created on first access."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_history import HISTORY_PREFERENCES_UPDATE
from app.models.user_preference import UserPreference
from app.schemas.preference_schema import PreferenceResponse, PreferenceUpdate
from app.services.user_service import record_history


def get_or_create_preference(db: Session, user: User) -> UserPreference:
    stmt = select(UserPreference).where(UserPreference.user_id == user.id)
    pref = db.execute(stmt).scalar_one_or_none()
    if pref is not None:
        return pref

    pref = UserPreference(user_id=user.id)
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def get_preference_response(db: Session, user: User) -> PreferenceResponse:
    pref = get_or_create_preference(db, user)
    return PreferenceResponse.model_validate(pref)


def update_preference(db: Session, user: User, body: PreferenceUpdate) -> PreferenceResponse:
    pref = get_or_create_preference(db, user)
    data = body.model_dump(exclude_unset=True)
    if not data:
        return PreferenceResponse.model_validate(pref)

    changed = False
    for key, value in data.items():
        if getattr(pref, key) != value:
            setattr(pref, key, value)
            changed = True

    if changed:
        record_history(db, user_id=user.id, action=HISTORY_PREFERENCES_UPDATE)
        db.commit()
        db.refresh(pref)

    return PreferenceResponse.model_validate(pref)
