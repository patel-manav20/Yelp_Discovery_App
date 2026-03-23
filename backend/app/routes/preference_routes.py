"""Dining preferences for the logged-in user."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.preference_schema import PreferenceResponse, PreferenceUpdate
from app.services import preference_service

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get("/me", response_model=PreferenceResponse, summary="Get my dining preferences")
def get_my_preferences(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PreferenceResponse:
    return preference_service.get_preference_response(db, user)


@router.put("/me", response_model=PreferenceResponse, summary="Update my dining preferences")
def put_my_preferences(
    body: PreferenceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PreferenceResponse:
    return preference_service.update_preference(db, user, body)
