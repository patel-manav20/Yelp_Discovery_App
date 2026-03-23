"""Owner dashboard and owned-restaurant read-only views."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import AppHTTPException
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.user import User
from app.models.user_history import HISTORY_RESTAURANT_VIEW, UserHistory
from app.schemas.owner_schema import (
    AnalyticsSummary,
    OwnerDashboardResponse,
    OwnerReviewListPage,
    OwnerReviewRow,
    SentimentSummary,
)
from app.schemas.review_schema import ReviewListPage, ReviewWithAuthor
from app.schemas.restaurant_schema import RestaurantSummary
from app.services.restaurant_service import restaurant_to_summary


def _owned_restaurant_ids(db: Session, owner_user_id: int) -> list[int]:
    """Return ids of restaurants where owner_user_id matches."""
    rows = db.execute(
        select(Restaurant.id).where(
            Restaurant.owner_user_id == owner_user_id,
            Restaurant.is_active.is_(True),
        )
    ).scalars().all()
    return [r for r in rows]


def get_dashboard(db: Session, owner: User) -> OwnerDashboardResponse:
    rid_list = _owned_restaurant_ids(db, owner.id)
    if not rid_list:
        return OwnerDashboardResponse(
            total_restaurants=0,
            total_reviews=0,
            average_rating=0.0,
            recent_reviews=[],
            analytics=AnalyticsSummary(),
        )

    total_restaurants = len(rid_list)

    # Count and average across all reviews on owned restaurants
    agg = db.execute(
        select(
            func.count(Review.id),
            func.coalesce(func.avg(Review.rating), 0.0),
        ).where(Review.restaurant_id.in_(rid_list))
    ).one()
    total_reviews = int(agg[0] or 0)
    avg_rating = round(float(agg[1] or 0.0), 2)

    # Recent reviews (last 10) with user and photos
    recent_stmt = (
        select(Review)
        .where(Review.restaurant_id.in_(rid_list))
        .options(selectinload(Review.user), selectinload(Review.photos))
        .order_by(Review.created_at.desc())
        .limit(10)
    )
    recent_rows = list(db.scalars(recent_stmt).unique().all())
    recent = [_review_to_with_author(r) for r in recent_rows]

    # Analytics: counts by rating
    by_rating = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    if total_reviews > 0:
        for r in db.execute(
            select(Review.rating, func.count(Review.id)).where(
                Review.restaurant_id.in_(rid_list)
            ).group_by(Review.rating)
        ).all():
            if 1 <= r[0] <= 5:
                by_rating[r[0]] = r[1]

    view_rows = db.scalar(
        select(func.count(UserHistory.id)).where(
            UserHistory.restaurant_id.in_(rid_list),
            UserHistory.action == HISTORY_RESTAURANT_VIEW,
        )
    )
    total_views = int(view_rows or 0)

    pos = neu = neg = 0
    if total_reviews > 0:
        pos = int(
            db.scalar(
                select(func.count(Review.id)).where(
                    Review.restaurant_id.in_(rid_list),
                    Review.rating >= 4,
                )
            )
            or 0
        )
        neu = int(
            db.scalar(
                select(func.count(Review.id)).where(
                    Review.restaurant_id.in_(rid_list),
                    Review.rating == 3,
                )
            )
            or 0
        )
        neg = int(
            db.scalar(
                select(func.count(Review.id)).where(
                    Review.restaurant_id.in_(rid_list),
                    Review.rating <= 2,
                )
            )
            or 0
        )

    def _pct(n: int) -> float:
        return round(100.0 * n / total_reviews, 1) if total_reviews else 0.0

    sentiment = SentimentSummary(
        positive_percent=_pct(pos),
        neutral_percent=_pct(neu),
        negative_percent=_pct(neg),
    )

    return OwnerDashboardResponse(
        total_restaurants=total_restaurants,
        total_reviews=total_reviews,
        average_rating=avg_rating,
        recent_reviews=recent,
        analytics=AnalyticsSummary(
            reviews_by_rating=by_rating,
            total_restaurant_views=total_views,
            sentiment=sentiment,
        ),
    )


def _review_to_with_author(review: Review) -> ReviewWithAuthor:
    from app.schemas.review_schema import ReviewPhotoResponse, ReviewResponse

    photos_sorted = sorted(review.photos, key=lambda p: p.id)
    base = ReviewResponse.model_validate(review)
    base_copy = base.model_copy(
        update={"photos": [ReviewPhotoResponse.model_validate(p) for p in photos_sorted]}
    )
    author = review.user.display_name if review.user else None
    return ReviewWithAuthor.model_validate(
        {**base_copy.model_dump(), "author_display_name": author}
    )


def list_owned_restaurants(db: Session, owner: User) -> list[RestaurantSummary]:
    stmt = (
        select(Restaurant)
        .where(
            Restaurant.owner_user_id == owner.id,
            Restaurant.is_active.is_(True),
        )
        .options(selectinload(Restaurant.photos))
        .order_by(Restaurant.name)
    )
    rows = list(db.scalars(stmt).unique().all())
    return [restaurant_to_summary(r) for r in rows]


def list_all_reviews_for_owner(
    db: Session,
    owner: User,
    *,
    restaurant_id: int | None = None,
    min_rating: int | None = None,
    sort_by: str = "newest",
    page: int = 1,
    limit: int = 20,
) -> OwnerReviewListPage:
    """All reviews across owned restaurants with filter/sort (read-only)."""
    rid_list = _owned_restaurant_ids(db, owner.id)
    if not rid_list:
        return OwnerReviewListPage(items=[], total=0)

    if restaurant_id is not None and restaurant_id not in rid_list:
        raise AppHTTPException(status_code=403, detail="You do not own this restaurant.")

    conditions = [
        Restaurant.owner_user_id == owner.id,
        Restaurant.is_active.is_(True),
        Review.restaurant_id.in_(rid_list),
    ]
    if restaurant_id is not None:
        conditions.append(Review.restaurant_id == restaurant_id)
    if min_rating is not None and 1 <= min_rating <= 5:
        conditions.append(Review.rating >= min_rating)

    total = db.scalar(
        select(func.count(Review.id))
        .select_from(Review)
        .join(Restaurant, Review.restaurant_id == Restaurant.id)
        .where(*conditions)
    )
    total_i = int(total or 0)

    stmt = (
        select(Review, Restaurant.name)
        .join(Restaurant, Review.restaurant_id == Restaurant.id)
        .where(*conditions)
        .options(selectinload(Review.user), selectinload(Review.photos))
    )
    sort_key = (sort_by or "newest").strip().lower()
    if sort_key == "oldest":
        stmt = stmt.order_by(Review.created_at.asc())
    elif sort_key == "rating_high":
        stmt = stmt.order_by(Review.rating.desc(), Review.created_at.desc())
    elif sort_key == "rating_low":
        stmt = stmt.order_by(Review.rating.asc(), Review.created_at.desc())
    else:
        stmt = stmt.order_by(Review.created_at.desc())

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    rows = list(db.execute(stmt).all())

    items: list[OwnerReviewRow] = []
    for review, rname in rows:
        base = _review_to_with_author(review)
        items.append(
            OwnerReviewRow(**{**base.model_dump(), "restaurant_name": rname or "Restaurant"})
        )
    return OwnerReviewListPage(items=items, total=total_i)


def list_reviews_for_owned_restaurant(
    db: Session,
    owner: User,
    restaurant_id: int,
    *,
    page: int = 1,
    limit: int = 20,
) -> ReviewListPage:
    restaurant = db.get(Restaurant, restaurant_id)
    if restaurant is None or not restaurant.is_active:
        raise AppHTTPException(status_code=404, detail="Restaurant not found.")
    if restaurant.owner_user_id != owner.id:
        raise AppHTTPException(status_code=403, detail="You do not own this restaurant.")

    total = db.scalar(
        select(func.count()).select_from(Review).where(Review.restaurant_id == restaurant_id)
    )
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
