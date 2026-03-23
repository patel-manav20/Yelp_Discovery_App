from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.restaurant_claim import ClaimStatus


class ClaimCreate(BaseModel):
    restaurant_id: int = Field(..., ge=1)
    message: str | None = Field(None, max_length=500)


class ClaimOnRestaurantBody(BaseModel):
    """Body for POST /restaurants/{id}/claim (restaurant id comes from path)."""

    message: str | None = Field(None, max_length=500)


class ClaimUpdate(BaseModel):
    """For admins / automated flows to resolve a claim."""

    status: ClaimStatus
    admin_note: str | None = Field(None, max_length=2000)


class ClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    restaurant_id: int
    status: ClaimStatus
    message: str | None
    admin_note: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
