"""Owner-only dashboard and owned restaurants (read-only reviews)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_owner
from app.db.database import get_db
from app.models.user import User
from app.schemas.owner_schema import (
    OwnerDashboardResponse,
    OwnerRestaurantListResponse,
    OwnerReviewListPage,
)
from app.schemas.review_schema import ReviewListPage
from app.services import owner_service

router = APIRouter(prefix="/owner", tags=["Owner Dashboard"])


@router.get(
    "/dashboard",
    response_model=OwnerDashboardResponse,
    summary="Owner dashboard summary",
    description="Shows totals, average rating, recent reviews, and analytics for restaurants you own.",
)
def get_dashboard(
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> OwnerDashboardResponse:
    return owner_service.get_dashboard(db, owner)


@router.get(
    "/restaurants",
    response_model=OwnerRestaurantListResponse,
    summary="List my owned restaurants",
)
def list_owned_restaurants(
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> OwnerRestaurantListResponse:
    items = owner_service.list_owned_restaurants(db, owner)
    return OwnerRestaurantListResponse(items=items, total=len(items))


_SORT_CHOICES = frozenset({"newest", "oldest", "rating_high", "rating_low"})


@router.get(
    "/reviews",
    response_model=OwnerReviewListPage,
    summary="All reviews on my restaurants",
    description="Read-only list with optional filter by restaurant, minimum stars, and sort.",
)
def list_all_my_reviews(
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
    restaurant_id: int | None = Query(None, ge=1, description="Limit to one owned listing"),
    min_rating: int | None = Query(None, ge=1, le=5, description="Only reviews at or above this star level"),
    sort_by: str = Query("newest", description="newest | oldest | rating_high | rating_low"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> OwnerReviewListPage:
    key = (sort_by or "newest").strip().lower()
    if key not in _SORT_CHOICES:
        key = "newest"
    return owner_service.list_all_reviews_for_owner(
        db,
        owner,
        restaurant_id=restaurant_id,
        min_rating=min_rating,
        sort_by=key,
        page=page,
        limit=limit,
    )


@router.get(
    "/restaurants/{restaurant_id}/reviews",
    response_model=ReviewListPage,
    summary="Reviews for my restaurant (read-only)",
    description="Only accessible if you own this restaurant.",
)
def get_owned_restaurant_reviews(
    restaurant_id: int,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> ReviewListPage:
    return owner_service.list_reviews_for_owned_restaurant(
        db, owner, restaurant_id, page=page, limit=limit
    )
