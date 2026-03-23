from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.favorite import Favorite
    from app.models.restaurant_claim import RestaurantClaim
    from app.models.restaurant_photo import RestaurantPhoto
    from app.models.review import Review
    from app.models.user import User
    from app.models.user_history import UserHistory


class RestaurantSourceType(str, enum.Enum):
    local = "local"
    yelp_fusion = "yelp_fusion"


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    address_line: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    state: Mapped[str | None] = mapped_column(String(64), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(64), nullable=False, default="US")
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    source_type: Mapped[RestaurantSourceType] = mapped_column(
        Enum(RestaurantSourceType, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
        default=RestaurantSourceType.local,
    )
    yelp_business_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True, index=True)
    is_claimed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    average_rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # 1–4 ($ to $$$$); optional for legacy rows
    price_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Filter facets (Yelp categories → cuisine_tags; dietary/ambiance for manual or future enrichment)
    cuisine_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    dietary_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ambiance_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    yelp_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    hours: Mapped[list | None] = mapped_column(JSON, nullable=True)
    transactions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Full JSON from GET /v3/businesses/{id} on last Yelp import (all fields Fusion returns)
    yelp_fusion_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner: Mapped[User | None] = relationship("User", back_populates="owned_restaurants")
    photos: Mapped[list[RestaurantPhoto]] = relationship(
        "RestaurantPhoto",
        back_populates="restaurant",
        cascade="all, delete-orphan",
        order_by="RestaurantPhoto.sort_order",
    )
    reviews: Mapped[list[Review]] = relationship("Review", back_populates="restaurant", cascade="all, delete-orphan")
    favorites: Mapped[list[Favorite]] = relationship("Favorite", back_populates="restaurant", cascade="all, delete-orphan")
    claims: Mapped[list[RestaurantClaim]] = relationship(
        "RestaurantClaim",
        back_populates="restaurant",
        cascade="all, delete-orphan",
    )
    history_entries: Mapped[list[UserHistory]] = relationship(
        "UserHistory",
        back_populates="restaurant",
        cascade="all, delete-orphan",
    )
