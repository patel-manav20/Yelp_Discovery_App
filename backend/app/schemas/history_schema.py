from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.restaurant_schema import RestaurantSummary


class UserHistoryEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    action: str = Field(..., description="e.g. restaurant_view, profile_update")
    restaurant_id: int | None
    viewed_at: datetime
    restaurant: RestaurantSummary | None = None


class UserHistoryListResponse(BaseModel):
    items: list[UserHistoryEntryResponse]
    total: int
