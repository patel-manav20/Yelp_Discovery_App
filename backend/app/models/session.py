from __future__ import annotations

from datetime import datetime

from beanie import Indexed, PydanticObjectId
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampedDocument


class Session(TimestampedDocument):
    user_id: PydanticObjectId
    token: Indexed(str, unique=True)  # type: ignore[valid-type]
    expires_at: datetime

    class Settings:
        name = "sessions"
        indexes = [IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0)]
