"""Load settings from environment variables (.env supported via pydantic-settings)."""

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # MySQL example: mysql+pymysql://user:password@localhost:3306/restaurant_lab
    database_url: str

    # Used to sign JWTs — use a long random string in production
    secret_key: str

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Comma-separated origins, e.g. http://localhost:5173,http://127.0.0.1:5173
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Set True locally if you want SQL echo in the terminal
    debug: bool = False

    # Yelp Fusion API (https://docs.developer.yelp.com/docs/fusion-intro)
    yelp_api_key: str | None = None

    # Google AI Gemini (https://ai.google.dev/) — optional; chat falls back without it
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"

    # Tavily Search API (https://tavily.com/) — optional web context for AI chat
    tavily_api_key: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
