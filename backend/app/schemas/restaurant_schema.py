from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.restaurant import RestaurantSourceType


class RestaurantPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: int
    photo_url: str
    sort_order: int
    created_at: datetime


class RestaurantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    address_line: str | None = Field(None, max_length=255)
    city: str = Field(..., min_length=1, max_length=120)
    state: str | None = Field(None, max_length=64)
    postal_code: str | None = Field(None, max_length=20)
    country: str = Field(default="US", max_length=64)
    phone: str | None = Field(None, max_length=32)
    website_url: str | None = Field(None, max_length=512)
    latitude: float | None = None
    longitude: float | None = None


class RestaurantCreate(RestaurantBase):
    source_type: RestaurantSourceType = RestaurantSourceType.local
    yelp_business_id: str | None = Field(None, max_length=128)
    price_level: int | None = Field(None, ge=1, le=4)
    cuisine_tags: list[str] | None = None
    dietary_tags: list[str] | None = None
    ambiance_tags: list[str] | None = None
    # Optional initial photos (URLs); sort_order follows list order
    photo_urls: list[str] = Field(default_factory=list, max_length=10)


class RestaurantUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    address_line: str | None = Field(None, max_length=255)
    city: str | None = Field(None, min_length=1, max_length=120)
    state: str | None = Field(None, max_length=64)
    postal_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=64)
    phone: str | None = Field(None, max_length=32)
    website_url: str | None = Field(None, max_length=512)
    latitude: float | None = None
    longitude: float | None = None
    price_level: int | None = Field(None, ge=1, le=4)
    cuisine_tags: list[str] | None = None
    dietary_tags: list[str] | None = None
    ambiance_tags: list[str] | None = None
    is_active: bool | None = None
    is_claimed: bool | None = None
    # When set (including []), replaces all listing photos; max 10 URLs
    photo_urls: list[str] | None = Field(None, max_length=10)


class RestaurantSummary(BaseModel):
    """Compact card for search / lists (Yelp-style browse)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    city: str
    state: str | None
    average_rating: float
    review_count: int
    source_type: RestaurantSourceType
    is_claimed: bool
    price_level: int | None = None
    cuisine_tags: list[str] | None = None
    primary_photo_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class RestaurantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    address_line: str | None
    city: str
    state: str | None
    postal_code: str | None
    country: str
    phone: str | None
    website_url: str | None
    latitude: float | None
    longitude: float | None
    source_type: RestaurantSourceType
    yelp_business_id: str | None
    is_claimed: bool
    owner_user_id: int | None
    average_rating: float
    review_count: int
    price_level: int | None = None
    cuisine_tags: list[str] | None = None
    dietary_tags: list[str] | None = None
    ambiance_tags: list[str] | None = None
    yelp_url: str | None = None
    hours: list | None = None
    transactions: list[str] | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    photos: list[RestaurantPhotoResponse] = Field(default_factory=list)


class PaginatedRestaurantCards(BaseModel):
    items: list[RestaurantSummary]
    page: int
    limit: int
    total: int


class PaginatedRestaurantFull(BaseModel):
    """Same pagination envelope as cards, but each item is a full `RestaurantResponse`."""

    items: list[RestaurantResponse]
    page: int
    limit: int
    total: int


class YelpImportRequest(BaseModel):
    yelp_business_id: str = Field(..., min_length=1, max_length=128)
