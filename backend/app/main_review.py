"""Review microservice entrypoint."""

from app.routes import review_routes
from app.service_app_factory import create_service_app

app = create_service_app(
    title="Review Service",
    description="Review CRUD endpoints.",
    routers=[review_routes.router],
)
