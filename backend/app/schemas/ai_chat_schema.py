"""Request/response models for POST /ai-assistant/chat."""

from typing import Any

from pydantic import BaseModel, Field


class ChatHistoryTurn(BaseModel):
    role: str = Field(..., description="Message role (e.g. user, assistant)")
    content: str = Field(..., description="Message text")


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    session_id: int | None = None
    conversation_history: list[ChatHistoryTurn] | None = None


class ParsedSearchFilters(BaseModel):
    """Structured filters extracted from the user message (and merged with prefs in the service)."""

    cuisine: str | None = None
    dietary: str | None = None
    price: int | None = Field(None, ge=1, le=4)
    ambiance: str | None = None
    occasion: str | None = None
    location: str | None = None
    timing: str | None = None
    keywords: list[str] = Field(default_factory=list)


class AIRecommendationItem(BaseModel):
    """One place for the frontend to render cards."""

    id: int | None = Field(None, description="Local DB restaurant id when from MySQL")
    name: str
    city: str
    state: str | None = None
    average_rating: float
    review_count: int
    price_level: int | None = None
    cuisine_tags: list[str] = Field(default_factory=list)
    source: str = Field(..., description="local | yelp_supplemental")
    yelp_business_id: str | None = None
    rank_score: float = Field(0.0, description="Internal ranking score (higher is better)")
    reason: str | None = Field(None, description="Short human-readable why this was recommended")


class AIChatResponse(BaseModel):
    reply: str
    applied_filters: dict[str, Any]
    recommendations: list[AIRecommendationItem]
    session_id: int
