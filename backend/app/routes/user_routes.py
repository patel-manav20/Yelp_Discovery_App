"""Logged-in user profile, profile photo URL, and activity history."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import AppHTTPException
from app.db.database import get_db
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.history_schema import UserHistoryListResponse
from app.schemas.user_schema import ProfilePhotoUrlBody, RecordRestaurantViewBody, UserResponse, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse, summary="Get my profile")
def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    return user_service.get_profile(user)


@router.put("/me", response_model=UserResponse, summary="Update my profile")
def put_me(
    body: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserResponse:
    return user_service.update_profile(db, user, body)


@router.post("/me/profile-photo", response_model=UserResponse, summary="Set profile photo URL")
def post_profile_photo(
    body: ProfilePhotoUrlBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserResponse:
    return user_service.set_profile_photo_url(db, user, body)


@router.post(
    "/me/restaurant-views",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Record a restaurant page view",
    description="Call when a signed-in user opens a local restaurant listing (powers owner view metrics).",
)
def post_restaurant_view(
    body: RecordRestaurantViewBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    row = db.get(Restaurant, body.restaurant_id)
    if row is None or not row.is_active:
        raise AppHTTPException(status_code=404, detail="Restaurant not found.")
    user_service.record_restaurant_view(db, user_id=user.id, restaurant_id=body.restaurant_id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/history", response_model=UserHistoryListResponse, summary="My activity history")
def get_my_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> UserHistoryListResponse:
    return user_service.list_history(db, user.id, limit=limit, offset=offset)
