from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_id: int
    photo_url: str
    created_at: datetime


class ReviewCreate(BaseModel):
    restaurant_id: int = Field(..., ge=1)
    rating: int = Field(..., ge=1, le=5)
    body: str | None = Field(None, max_length=5000)
    photo_urls: list[str] = Field(default_factory=list, max_length=5)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)
    body: str | None = Field(None, max_length=5000)
    # If sent (including []), replaces all existing review photos with this list (max 5 URLs).
    photo_urls: list[str] | None = Field(None, max_length=5)


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    restaurant_id: int
    rating: int
    body: str | None
    created_at: datetime
    updated_at: datetime
    photos: list[ReviewPhotoResponse] = Field(default_factory=list)


class ReviewWithAuthor(ReviewResponse):
    """Same as ReviewResponse plus author display for detail pages."""

    author_display_name: str | None = None


class ReviewListPage(BaseModel):
    items: list[ReviewWithAuthor]
    total: int
