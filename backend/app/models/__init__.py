# Import models so Alembic / metadata sees all tables
from app.models.base import Base
from app.models.chat_message import ChatMessage, ChatMessageRole
from app.models.chat_session import ChatSession
from app.models.favorite import Favorite
from app.models.restaurant import Restaurant, RestaurantSourceType
from app.models.restaurant_claim import ClaimStatus, RestaurantClaim
from app.models.restaurant_photo import RestaurantPhoto
from app.models.review import Review
from app.models.review_photo import ReviewPhoto
from app.models.user import User, UserRole
from app.models.user_history import UserHistory
from app.models.user_preference import UserPreference

__all__ = [
    "Base",
    "ChatMessage",
    "ChatMessageRole",
    "ChatSession",
    "ClaimStatus",
    "Favorite",
    "Restaurant",
    "RestaurantClaim",
    "RestaurantPhoto",
    "RestaurantSourceType",
    "Review",
    "ReviewPhoto",
    "User",
    "UserHistory",
    "UserPreference",
    "UserRole",
]
