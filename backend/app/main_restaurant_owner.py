"""Restaurant owner microservice entrypoint."""

from app.routes import owner_routes, upload_routes
from app.service_app_factory import create_service_app

app = create_service_app(
    title="Restaurant Owner Service",
    description="Owner dashboard and owner-managed upload flows.",
    routers=[
        owner_routes.router,
        upload_routes.router,
    ],
    include_uploads_mount=True,
)
