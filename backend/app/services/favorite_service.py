"""Saved restaurants (favorites): add, remove, list — duplicates blocked by service check."""

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import AppHTTPException
from app.models.favorite import Favorite
from app.models.restaurant import Restaurant
from app.models.user import User
from app.models.user_history import HISTORY_FAVORITE_ADD, HISTORY_FAVORITE_REMOVE
from app.schemas.favorite_schema import (
    FavoriteListResponse,
    FavoriteResponse,
    FavoriteWithRestaurant,
)
from app.services.restaurant_service import restaurant_to_summary
from app.services.user_service import record_history


def _restaurant_must_exist(db: Session, restaurant_id: int) -> Restaurant:
    restaurant = db.get(Restaurant, restaurant_id)
    if restaurant is None or not restaurant.is_active:
        raise AppHTTPException(status_code=404, detail="Restaurant not found.")
    return restaurant


def _favorite_with_restaurant(fav: Favorite) -> FavoriteWithRestaurant:
    base = FavoriteResponse.model_validate(fav)
    summary = restaurant_to_summary(fav.restaurant)
    return FavoriteWithRestaurant.model_validate({**base.model_dump(), "restaurant": summary})


def add_favorite(db: Session, user: User, restaurant_id: int) -> FavoriteWithRestaurant:
    _restaurant_must_exist(db, restaurant_id)

    existing = db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.restaurant_id == restaurant_id,
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise AppHTTPException(
            status_code=409,
            detail="This restaurant is already in your favorites.",
        )

    fav = Favorite(user_id=user.id, restaurant_id=restaurant_id)
    db.add(fav)
    record_history(db, user_id=user.id, action=HISTORY_FAVORITE_ADD, restaurant_id=restaurant_id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppHTTPException(
            status_code=409,
            detail="This restaurant is already in your favorites.",
        ) from None
    db.refresh(fav)

    stmt = (
        select(Favorite)
        .where(Favorite.id == fav.id)
        .options(selectinload(Favorite.restaurant).selectinload(Restaurant.photos))
    )
    row = db.execute(stmt).scalar_one()
    return _favorite_with_restaurant(row)


def remove_favorite(db: Session, user: User, restaurant_id: int) -> None:
    fav = db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.restaurant_id == restaurant_id,
        )
    ).scalar_one_or_none()
    if fav is None:
        raise AppHTTPException(status_code=404, detail="Favorite not found.")

    db.delete(fav)
    record_history(db, user_id=user.id, action=HISTORY_FAVORITE_REMOVE, restaurant_id=restaurant_id)
    db.commit()


def list_my_favorites(db: Session, user: User) -> FavoriteListResponse:
    total = db.scalar(select(func.count()).select_from(Favorite).where(Favorite.user_id == user.id))
    if total is None:
        total = 0

    stmt = (
        select(Favorite)
        .where(Favorite.user_id == user.id)
        .options(selectinload(Favorite.restaurant).selectinload(Restaurant.photos))
        .order_by(Favorite.created_at.desc())
    )
    rows = list(db.scalars(stmt).unique().all())
    items = [_favorite_with_restaurant(f) for f in rows]
    return FavoriteListResponse(items=items, total=total)
