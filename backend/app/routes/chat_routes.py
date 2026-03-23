"""AI assistant: Gemini-powered chat, sessions, and recommendations."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.ai_chat_schema import AIChatRequest, AIChatResponse
from app.schemas.chat_schema import ChatSessionResponse, ChatSessionWithMessages
from app.services import ai_chat_service

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


@router.post("/chat", response_model=AIChatResponse, summary="Send a chat message")
def post_chat(
    body: AIChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AIChatResponse:
    return ai_chat_service.process_chat_message(db, user, body)


@router.get("/sessions", response_model=list[ChatSessionResponse], summary="My chat sessions")
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ChatSessionResponse]:
    return ai_chat_service.list_my_chat_sessions(db, user)


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionWithMessages,
    summary="Get a session and its messages",
)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatSessionWithMessages:
    return ai_chat_service.get_session_detail(db, user, session_id)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat session",
)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    ai_chat_service.delete_chat_session(db, user, session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
