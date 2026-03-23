"""Authenticated image uploads for restaurant listings (stored on disk, served under /files)."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.core.dependencies import get_current_user
from app.core.exceptions import AppHTTPException
from app.db.database import get_db
from app.models.user import User
from app.schemas.user_schema import ProfilePhotoUrlBody
from app.services import user_service
from sqlalchemy.orm import Session

router = APIRouter(tags=["Uploads"])

BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_ROOT / "uploads" / "restaurant_photos"
PROFILE_UPLOAD_DIR = BACKEND_ROOT / "uploads" / "profile_photos"

ALLOWED_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_BYTES = 5 * 1024 * 1024


@router.post(
    "/uploads/restaurant-photo",
    summary="Upload one restaurant photo",
    description="JPEG, PNG, WebP, or GIF up to 5MB. Returns a public URL for use in photo_urls.",
)
async def upload_restaurant_photo(
    request: Request,
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
) -> dict[str, str]:
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct not in ALLOWED_TYPES:
        raise AppHTTPException(
            status_code=400,
            detail="Unsupported type. Use JPEG, PNG, WebP, or GIF.",
        )
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise AppHTTPException(status_code=400, detail="Image must be 5MB or smaller.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ALLOWED_TYPES[ct]}"
    dest = UPLOAD_DIR / name
    dest.write_bytes(raw)

    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/files/restaurant_photos/{name}"}


@router.post(
    "/uploads/profile-photo",
    summary="Upload one profile photo",
    description="JPEG, PNG, WebP, or GIF up to 5MB. Returns a public URL and updates your profile avatar.",
)
async def upload_profile_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct not in ALLOWED_TYPES:
        raise AppHTTPException(
            status_code=400,
            detail="Unsupported type. Use JPEG, PNG, WebP, or GIF.",
        )

    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise AppHTTPException(status_code=400, detail="Image must be 5MB or smaller.")

    PROFILE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ALLOWED_TYPES[ct]}"
    dest = PROFILE_UPLOAD_DIR / name
    dest.write_bytes(raw)

    base = str(request.base_url).rstrip("/")
    url = f"{base}/files/profile_photos/{name}"

    # Persist avatar URL in MySQL (keeps existing `/users/me/profile-photo` logic).
    user_service.set_profile_photo_url(db, user, ProfilePhotoUrlBody(avatar_url=url))

    return {"url": url}
