"""Reviews: create, list by restaurant, update/delete own review only."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.review_schema import ReviewCreate, ReviewListPage, ReviewResponse, ReviewUpdate
from app.services import review_service

router = APIRouter(tags=["Reviews"])


@router.get(
    "/restaurants/{restaurant_id}/reviews",
    response_model=ReviewListPage,
    summary="List reviews for a restaurant",
    description="Public. Restaurant owners can read reviews here but cannot delete others' reviews via the API.",
)
def list_restaurant_reviews(
    restaurant_id: int,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> ReviewListPage:
    return review_service.list_reviews_for_restaurant(db, restaurant_id, page=page, limit=limit)


@router.post(
    "/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a review",
)
def create_review(
    body: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReviewResponse:
    return review_service.create_review(db, user, body)


@router.put(
    "/reviews/{review_id}",
    response_model=ReviewResponse,
    summary="Update my review",
)
def update_review(
    review_id: int,
    body: ReviewUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReviewResponse:
    return review_service.update_review(db, user, review_id, body)


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete my review",
)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    review_service.delete_review(db, user, review_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
