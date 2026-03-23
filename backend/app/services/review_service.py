"""Reviews: create/update/delete with author-only edits and restaurant rating rollup."""

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import AppHTTPException
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.review_photo import ReviewPhoto
from app.models.user import User
from app.models.user_history import (
    HISTORY_REVIEW_CREATE,
    HISTORY_REVIEW_DELETE,
    HISTORY_REVIEW_UPDATE,
)
from app.schemas.review_schema import (
    ReviewCreate,
    ReviewListPage,
    ReviewPhotoResponse,
    ReviewResponse,
    ReviewUpdate,
    ReviewWithAuthor,
)
from app.services.user_service import record_history


def recalculate_restaurant_rating(db: Session, restaurant_id: int) -> None:
    """
    Set restaurant.average_rating and review_count from all rows in `reviews`
    for this restaurant (local reviews only).
    """
    row = db.execute(
        select(
            func.coalesce(func.avg(Review.rating), 0.0),
            func.count(Review.id),
        ).where(Review.restaurant_id == restaurant_id)
    ).one()
    avg_val, n = row[0], row[1]
    restaurant = db.get(Restaurant, restaurant_id)
    if restaurant is not None:
        restaurant.average_rating = round(float(avg_val), 2)
        restaurant.review_count = int(n)


def _review_to_response(review: Review) -> ReviewResponse:
    photos_sorted = sorted(review.photos, key=lambda p: p.id)
    base = ReviewResponse.model_validate(review)
    return base.model_copy(
        update={"photos": [ReviewPhotoResponse.model_validate(p) for p in photos_sorted]}
    )


def _review_to_with_author(review: Review) -> ReviewWithAuthor:
    base = _review_to_response(review)
    author = review.user.display_name if review.user else None
    return ReviewWithAuthor.model_validate({**base.model_dump(), "author_display_name": author})


def _assert_restaurant_listable(db: Session, restaurant_id: int) -> Restaurant:
    restaurant = db.get(Restaurant, restaurant_id)
    if restaurant is None or not restaurant.is_active:
        raise AppHTTPException(status_code=404, detail="Restaurant not found.")
    return restaurant


def _replace_review_photos(db: Session, review: Review, urls: list[str]) -> None:
    db.execute(delete(ReviewPhoto).where(ReviewPhoto.review_id == review.id))
    for i, url in enumerate(urls[:5]):
        u = url.strip()
        if u:
            db.add(ReviewPhoto(review_id=review.id, photo_url=u))


def create_review(db: Session, user: User, body: ReviewCreate) -> ReviewResponse:
    restaurant = _assert_restaurant_listable(db, body.restaurant_id)

    review = Review(
        user_id=user.id,
        restaurant_id=restaurant.id,
        rating=body.rating,
        body=body.body,
    )
    db.add(review)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise AppHTTPException(
            status_code=409,
            detail="You already reviewed this restaurant. Use update instead.",
        ) from None

    urls = body.photo_urls or []
    _replace_review_photos(db, review, urls)

    db.flush()
    recalculate_restaurant_rating(db, restaurant.id)
    record_history(db, user_id=user.id, action=HISTORY_REVIEW_CREATE, restaurant_id=restaurant.id)
    db.commit()

    stmt = (
        select(Review)
        .where(Review.id == review.id)
        .options(selectinload(Review.photos))
    )
    row = db.execute(stmt).scalar_one()
    return _review_to_response(row)


def list_reviews_for_restaurant(
    db: Session,
    restaurant_id: int,
    *,
    page: int = 1,
    limit: int = 20,
) -> ReviewListPage:
    _assert_restaurant_listable(db, restaurant_id)

    total = db.scalar(select(func.count()).select_from(Review).where(Review.restaurant_id == restaurant_id))
    if total is None:
        total = 0

    stmt = (
        select(Review)
        .where(Review.restaurant_id == restaurant_id)
        .options(selectinload(Review.user), selectinload(Review.photos))
        .order_by(Review.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = list(db.scalars(stmt).unique().all())
    items = [_review_to_with_author(r) for r in rows]
    return ReviewListPage(items=items, total=total)


def _get_review_or_404(db: Session, review_id: int) -> Review:
    stmt = (
        select(Review)
        .where(Review.id == review_id)
        .options(selectinload(Review.user), selectinload(Review.photos))
    )
    review = db.execute(stmt).scalar_one_or_none()
    if review is None:
        raise AppHTTPException(status_code=404, detail="Review not found.")
    return review


def _assert_author(review: Review, user: User) -> None:
    if review.user_id != user.id:
        raise AppHTTPException(
            status_code=403,
            detail="You can only edit or delete your own reviews.",
        )


def update_review(db: Session, user: User, review_id: int, body: ReviewUpdate) -> ReviewResponse:
    review = _get_review_or_404(db, review_id)
    _assert_author(review, user)

    data = body.model_dump(exclude_unset=True)
    if not data:
        return _review_to_response(review)

    if "photo_urls" in data:
        urls = data.pop("photo_urls")
        if urls is not None:
            _replace_review_photos(db, review, urls)

    for key, value in data.items():
        setattr(review, key, value)

    db.flush()
    recalculate_restaurant_rating(db, review.restaurant_id)
    record_history(db, user_id=user.id, action=HISTORY_REVIEW_UPDATE, restaurant_id=review.restaurant_id)
    db.commit()

    stmt = (
        select(Review)
        .where(Review.id == review.id)
        .options(selectinload(Review.photos))
    )
    row = db.execute(stmt).scalar_one()
    return _review_to_response(row)


def delete_review(db: Session, user: User, review_id: int) -> None:
    review = _get_review_or_404(db, review_id)
    _assert_author(review, user)

    rid = review.restaurant_id
    db.delete(review)
    db.flush()
    recalculate_restaurant_rating(db, rid)
    record_history(db, user_id=user.id, action=HISTORY_REVIEW_DELETE, restaurant_id=rid)
    db.commit()
