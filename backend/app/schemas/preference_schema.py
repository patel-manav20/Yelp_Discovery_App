from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PreferenceBase(BaseModel):
    default_city: str | None = Field(None, max_length=120)
    price_level: int | None = Field(None, ge=1, le=4)
    cuisine_tags: list[str] | None = None

    @field_validator("cuisine_tags")
    @classmethod
    def trim_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        cleaned = [t.strip() for t in v if t.strip()]
        return cleaned[:20]


class PreferenceCreate(PreferenceBase):
    pass


class PreferenceUpdate(BaseModel):
    default_city: str | None = Field(None, max_length=120)
    price_level: int | None = Field(None, ge=1, le=4)
    cuisine_tags: list[str] | None = None

    @field_validator("cuisine_tags")
    @classmethod
    def trim_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        cleaned = [t.strip() for t in v if t.strip()]
        return cleaned[:20]


class PreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    default_city: str | None
    price_level: int | None
    cuisine_tags: list[str] | None
    created_at: datetime
    updated_at: datetime
