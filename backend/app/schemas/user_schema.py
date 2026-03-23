from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.user import UserRole

_US_COUNTRY_CODES = frozenset({"US", "USA"})


class UserBase(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    display_name: str = Field(..., min_length=1, max_length=120)
    phone: str | None = Field(None, max_length=32)
    city: str | None = Field(None, max_length=120)
    state: str | None = Field(None, max_length=64)
    country: str | None = Field(None, max_length=64)
    bio: str | None = Field(None, max_length=500)
    avatar_url: str | None = Field(None, max_length=512)
    languages: list[str] | None = Field(default=None)
    gender: str | None = Field(default=None, max_length=32)


class UserCreate(UserBase):
    """Used internally after auth; password handled separately."""

    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.user


class RecordRestaurantViewBody(BaseModel):
    """Logged-in diner opened a restaurant detail page (drives owner analytics)."""

    restaurant_id: int = Field(..., ge=1)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    display_name: str | None = Field(None, min_length=1, max_length=120)
    phone: str | None = Field(None, max_length=32)
    city: str | None = Field(None, max_length=120)
    state: str | None = Field(None, max_length=64)
    country: str | None = Field(None, max_length=64)
    bio: str | None = Field(None, max_length=500)
    avatar_url: str | None = Field(None, max_length=512)
    languages: list[str] | None = Field(default=None)
    gender: str | None = Field(default=None, max_length=32)

    @field_validator("country", "state")
    @classmethod
    def strip_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None

    @field_validator("languages")
    @classmethod
    def normalize_languages(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        out: list[str] = []
        for x in v:
            if isinstance(x, str):
                s = x.strip()
                if s:
                    out.append(s)
        return out[:20] if out else None

    @field_validator("gender")
    @classmethod
    def strip_gender(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None

    @model_validator(mode="after")
    def country_state_simple_rules(self):
        """Light rules: US/USA expects a 2-letter state when state is provided."""
        country = self.country
        state = self.state
        if country is None and state is None:
            return self
        if country:
            c = country.strip().upper()
            if len(c) > 64:
                raise ValueError("Country must be at most 64 characters")
        if state:
            st = state.strip().upper()
            if len(st) > 64:
                raise ValueError("State must be at most 64 characters")
            if country and country.strip().upper() in _US_COUNTRY_CODES and len(st) != 2:
                raise ValueError("For US, use a 2-letter state code (e.g. CA)")
        return self


class ProfilePhotoUrlBody(BaseModel):
    """Client sends a hosted image URL for now (no file upload yet)."""

    avatar_url: str = Field(..., min_length=8, max_length=512)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    display_name: str
    phone: str | None
    city: str | None
    state: str | None
    country: str | None
    bio: str | None
    avatar_url: str | None
    languages: list[str] | None
    gender: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
