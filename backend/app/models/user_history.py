from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.restaurant import Restaurant
    from app.models.user import User


class UserHistory(Base):
    """
    Activity log: restaurant views and account events (profile, photo, preferences).
    `restaurant_id` is set for restaurant_view; null for profile-style actions.
    """

    __tablename__ = "user_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    restaurant_id: Mapped[int | None] = mapped_column(
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # e.g. restaurant_view, profile_update, profile_photo_update, preferences_update
    action: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        server_default=text("'restaurant_view'"),
    )
    viewed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    user: Mapped[User] = relationship("User", back_populates="history_entries")
    restaurant: Mapped[Restaurant | None] = relationship("Restaurant", back_populates="history_entries")


# Values for `UserHistory.action` (keep in sync when logging from services)
HISTORY_RESTAURANT_VIEW = "restaurant_view"
HISTORY_PROFILE_UPDATE = "profile_update"
HISTORY_PROFILE_PHOTO_UPDATE = "profile_photo_update"
HISTORY_PREFERENCES_UPDATE = "preferences_update"
HISTORY_REVIEW_CREATE = "review_create"
HISTORY_REVIEW_UPDATE = "review_update"
HISTORY_REVIEW_DELETE = "review_delete"
HISTORY_FAVORITE_ADD = "favorite_add"
HISTORY_FAVORITE_REMOVE = "favorite_remove"
