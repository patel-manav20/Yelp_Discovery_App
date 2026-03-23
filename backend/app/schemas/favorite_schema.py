from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.restaurant_schema import RestaurantSummary


class FavoriteCreate(BaseModel):
    restaurant_id: int = Field(..., ge=1)


class FavoriteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    restaurant_id: int
    created_at: datetime


class FavoriteWithRestaurant(FavoriteResponse):
    restaurant: RestaurantSummary


class FavoriteListResponse(BaseModel):
    items: list[FavoriteWithRestaurant]
    total: int
