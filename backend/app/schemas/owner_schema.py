"""Schemas for owner dashboard and owned restaurants."""

from pydantic import BaseModel, Field

from app.schemas.review_schema import ReviewWithAuthor
from app.schemas.restaurant_schema import RestaurantSummary


class SentimentSummary(BaseModel):
    """Share of reviews by tone (star-based proxy for lab sentiment analysis)."""

    positive_percent: float = Field(0.0, description="Reviews with 4–5 stars, % of total.")
    neutral_percent: float = Field(0.0, description="Reviews with 3 stars, % of total.")
    negative_percent: float = Field(0.0, description="Reviews with 1–2 stars, % of total.")


class AnalyticsSummary(BaseModel):
    """Counts: reviews by rating, page views, sentiment."""

    reviews_by_rating: dict[int, int] = Field(
        default_factory=lambda: {5: 0, 4: 0, 3: 0, 2: 0, 1: 0},
        description="Count of reviews at each star level (1–5).",
    )
    total_restaurant_views: int = Field(
        0,
        description="Signed-in user detail-page views recorded for your listings (user_history).",
    )
    sentiment: SentimentSummary = Field(default_factory=SentimentSummary)


class OwnerDashboardResponse(BaseModel):
    total_restaurants: int
    total_reviews: int
    average_rating: float = Field(..., description="Weighted average across all reviews on owned restaurants.")
    recent_reviews: list[ReviewWithAuthor] = Field(default_factory=list)
    analytics: AnalyticsSummary = Field(default_factory=AnalyticsSummary)


class OwnerRestaurantListResponse(BaseModel):
    items: list[RestaurantSummary]
    total: int


class OwnerReviewRow(ReviewWithAuthor):
    restaurant_name: str


class OwnerReviewListPage(BaseModel):
    items: list[OwnerReviewRow]
    total: int
