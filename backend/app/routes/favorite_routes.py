"""Favorites: save / unsave restaurants and list mine."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.favorite_schema import FavoriteListResponse, FavoriteWithRestaurant
from app.services import favorite_service

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("/me", response_model=FavoriteListResponse, summary="My saved restaurants")
def list_my_favorites(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FavoriteListResponse:
    return favorite_service.list_my_favorites(db, user)


@router.post(
    "/{restaurant_id}",
    response_model=FavoriteWithRestaurant,
    status_code=status.HTTP_201_CREATED,
    summary="Add restaurant to favorites",
)
def add_favorite(
    restaurant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FavoriteWithRestaurant:
    return favorite_service.add_favorite(db, user, restaurant_id)


@router.delete(
    "/{restaurant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove restaurant from favorites",
)
def remove_favorite(
    restaurant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    favorite_service.remove_favorite(db, user, restaurant_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
