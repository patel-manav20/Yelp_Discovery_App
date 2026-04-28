"""Helpers to build service-specific FastAPI apps."""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
from pathlib import Path
from typing import Iterable

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import AppHTTPException, app_http_exception_handler
from app.db.database import close_db, init_db, is_db_ready
from app.kafka.producer import kafka_producer

_log = logging.getLogger(__name__)


def create_service_app(
    *,
    title: str,
    description: str,
    routers: Iterable[APIRouter],
    include_uploads_mount: bool = False,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            await init_db()
            await kafka_producer.start()
            _log.info("MongoDB connection OK")
        except Exception as exc:  # noqa: BLE001
            _log.warning("MongoDB not reachable at startup (API will still run): %s", exc)
        try:
            yield
        finally:
            await kafka_producer.stop()
            await close_db()

    app = FastAPI(
        title=title,
        description=description,
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

    for router in routers:
        app.include_router(router)

    if include_uploads_mount:
        uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        app.mount("/files", StaticFiles(directory=str(uploads_dir)), name="uploaded_files")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/health/ready")
    async def health_ready():
        db_ok = await is_db_ready()
        kafka_ok = kafka_producer.is_ready()
        if not (db_ok and kafka_ok):
            return {"status": "degraded", "db_ready": db_ok, "kafka_ready": kafka_ok}
        return {"status": "ok", "db_ready": True, "kafka_ready": True}

    return app
