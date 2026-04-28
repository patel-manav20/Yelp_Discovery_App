"""Restaurant microservice entrypoint."""

from app.routes import restaurant_routes, upload_routes
from app.service_app_factory import create_service_app

app = create_service_app(
    title="Restaurant Service",
    description="Restaurant catalog/search/detail endpoints.",
    routers=[
        restaurant_routes.router,
        upload_routes.router,
    ],
    include_uploads_mount=True,
)
