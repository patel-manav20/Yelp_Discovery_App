from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.chat_message import ChatMessageRole


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=8000)


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chat_session_id: int
    role: ChatMessageRole
    content: str
    created_at: datetime


class ChatSessionCreate(BaseModel):
    title: str | None = Field(None, max_length=200)


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str | None
    created_at: datetime
    updated_at: datetime


class ChatSessionWithMessages(ChatSessionResponse):
    messages: list[ChatMessageResponse] = Field(default_factory=list)
