"""User / Reviewer microservice entrypoint."""

from app.routes import auth_routes, chat_routes, favorite_routes, preference_routes, user_routes
from app.service_app_factory import create_service_app

app = create_service_app(
    title="User Reviewer Service",
    description="Authentication, user profile, preferences, favorites, and chat.",
    routers=[
        auth_routes.router,
        user_routes.router,
        preference_routes.router,
        favorite_routes.router,
        chat_routes.router,
    ],
)
