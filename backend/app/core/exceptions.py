"""App-specific exceptions and FastAPI handlers."""

from fastapi import Request
from fastapi.responses import JSONResponse


class AppHTTPException(Exception):
    """Raise this for predictable API errors; handled globally in main.py."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


async def app_http_exception_handler(request: Request, exc: AppHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
