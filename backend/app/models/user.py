from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.chat_session import ChatSession
    from app.models.favorite import Favorite
    from app.models.restaurant import Restaurant
    from app.models.restaurant_claim import RestaurantClaim
    from app.models.review import Review
    from app.models.user_history import UserHistory
    from app.models.user_preference import UserPreference


class UserRole(str, enum.Enum):
    user = "user"
    owner = "owner"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
        default=UserRole.user,
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    state: Mapped[str | None] = mapped_column(String(64), nullable=True)
    country: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # e.g. ["English", "Gujarati"] — stored as MySQL JSON
    languages: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    preference: Mapped[UserPreference | None] = relationship(
        "UserPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    owned_restaurants: Mapped[list[Restaurant]] = relationship("Restaurant", back_populates="owner")
    reviews: Mapped[list[Review]] = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    favorites: Mapped[list[Favorite]] = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    history_entries: Mapped[list[UserHistory]] = relationship(
        "UserHistory",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    claims: Mapped[list[RestaurantClaim]] = relationship(
        "RestaurantClaim",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    chat_sessions: Mapped[list[ChatSession]] = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
