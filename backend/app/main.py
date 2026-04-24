"""FastAPI application entrypoint.

Route map (all paths relative to server root; no global /api prefix):

| Tag              | Prefix / base paths |
|------------------|---------------------|
| Authentication   | /auth/*             |
| Users            | /users/*            |
| Preferences      | /preferences/*      |
| Restaurants      | /restaurants/* (includes ``GET /restaurants/yelp``, ``GET /restaurants/yelp/{yelp_id}`` Yelp proxy) |
| Reviews          | /restaurants/{id}/reviews, /reviews/* |
| Favorites        | /favorites/*        |
| Owner Dashboard  | /owner/*            |
| Uploads          | POST /uploads/restaurant-photo, static /files/* |
| AI Assistant     | /ai-assistant/*     |
| Health           | /health             |
| Docs             | /docs, /redoc       |
"""

from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import AppHTTPException, app_http_exception_handler
from app.db.database import get_mongo_client
from app.routes import (
    auth_routes,
    chat_routes,
    favorite_routes,
    owner_routes,
    preference_routes,
    restaurant_routes,
    review_routes,
    upload_routes,
    user_routes,
)

_log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify MongoDB connectivity once at startup (non-fatal if DB is down)."""
    try:
        client = get_mongo_client()
        client.admin.command('ping')
        _log.info("MongoDB connection OK")
    except Exception as exc:  # noqa: BLE001 — log any connection failure
        _log.warning("MongoDB not reachable at startup (API will still run): %s", exc)
    yield


app = FastAPI(
    title="Restaurant Lab API",
    description="Yelp-style lab backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppHTTPException, app_http_exception_handler)

app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(preference_routes.router)
app.include_router(restaurant_routes.router)
app.include_router(review_routes.router)
app.include_router(favorite_routes.router)
app.include_router(owner_routes.router)
app.include_router(chat_routes.router)
app.include_router(upload_routes.router)

_uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=str(_uploads_dir)), name="uploaded_files")


@app.get("/health")
def health():
    return {"status": "ok"}