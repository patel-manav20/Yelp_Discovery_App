"""Seed MongoDB with baseline Lab 2 demo data."""

from __future__ import annotations

import asyncio
from datetime import timedelta
import os

import httpx
from app.core.security import hash_password
from app.core.config import settings
from app.db.database import close_db, init_db
from app.models.favorite import Favorite
from app.models.restaurant import Restaurant, RestaurantSourceType
from app.models.restaurant_claim import ClaimStatus, RestaurantClaim
from app.models.restaurant_photo import RestaurantPhoto
from app.models.review import Review
from app.models.review_photo import ReviewPhoto
from app.models.session import Session
from app.models.user import User, UserRole
from app.models.user_history import HISTORY_RESTAURANT_VIEW, UserHistory
from app.models.user_preference import UserPreference
from app.models.base import utc_now

DEFAULT_CITIES = ["San Jose, CA", "Santa Clara, CA", "Sunnyvale, CA", "Fremont, CA"]
DEFAULT_PER_CITY = 40


async def _import_yelp_restaurants(per_city: int = DEFAULT_PER_CITY) -> int:
    """Import Yelp search results into Restaurant collection."""
    api_key = settings.yelp_api_key or os.getenv("YELP_API_KEY")
    if not api_key:
        return 0

    imported = 0
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        for city in DEFAULT_CITIES:
            target = max(1, min(per_city, 100))
            offset = 0
            while offset < target:
                limit = min(50, target - offset)
                resp = await client.get(
                    "https://api.yelp.com/v3/businesses/search",
                    params={
                        "location": city,
                        "term": "restaurants",
                        "limit": limit,
                        "offset": offset,
                        "sort_by": "best_match",
                    },
                    headers=headers,
                )
                if resp.status_code != 200:
                    break
                businesses = (resp.json() or {}).get("businesses") or []
                if not businesses:
                    break

                for b in businesses:
                    yelp_id = b.get("id")
                    if not yelp_id:
                        continue
                    existing = await Restaurant.find_one(Restaurant.yelp_business_id == yelp_id)
                    location = b.get("location") or {}
                    coords = b.get("coordinates") or {}
                    categories = b.get("categories") or []
                    data = dict(
                        name=b.get("name") or "Unknown",
                        description=(b.get("categories") or [{}])[0].get("title"),
                        address_line=", ".join(location.get("display_address") or []),
                        city=location.get("city") or "Unknown",
                        state=location.get("state"),
                        postal_code=location.get("zip_code"),
                        country=(location.get("country") or "US"),
                        phone=b.get("display_phone") or b.get("phone"),
                        latitude=coords.get("latitude"),
                        longitude=coords.get("longitude"),
                        source_type=RestaurantSourceType.yelp_fusion,
                        yelp_business_id=yelp_id,
                        average_rating=float(b.get("rating") or 0.0),
                        review_count=int(b.get("review_count") or 0),
                        price_level=len(b.get("price") or "") or None,
                        cuisine_tags=[c.get("title") for c in categories if c.get("title")] or None,
                        yelp_url=b.get("url"),
                        transactions=b.get("transactions") or None,
                        yelp_fusion_snapshot=b,
                    )
                    if existing is None:
                        await Restaurant(**data).insert()
                        imported += 1
                    else:
                        for k, v in data.items():
                            setattr(existing, k, v)
                        await existing.save()
                offset += len(businesses)
    return imported


async def seed() -> None:
    await init_db()
    try:
        demo_user = await User.find_one(User.email == "demo@example.com")
        if demo_user is None:
            demo_user = await User(
                email="demo@example.com",
                password_hash=hash_password("demo1234"),
                role=UserRole.user,
                display_name="Demo User",
                city="San Jose",
                state="CA",
                country="US",
                languages=["English"],
            ).insert()

        owner_user = await User.find_one(User.email == "owner@example.com")
        if owner_user is None:
            owner_user = await User(
                email="owner@example.com",
                password_hash=hash_password("owner1234"),
                role=UserRole.owner,
                display_name="Demo Owner",
                city="San Jose",
                state="CA",
                country="US",
                languages=["English"],
            ).insert()

        restaurant = await Restaurant.find_one(Restaurant.name == "Nayan's Grill House")
        if restaurant is None:
            restaurant = await Restaurant(
                name="Nayan's Grill House",
                description="Modern Indian fusion with vegan-friendly options.",
                address_line="123 Santa Clara St",
                city="San Jose",
                state="CA",
                postal_code="95113",
                country="US",
                phone="+1-408-555-0110",
                website_url="https://example.com/nayans-grill-house",
                source_type=RestaurantSourceType.local,
                owner_user_id=owner_user.id,
                is_claimed=True,
                average_rating=4.5,
                review_count=1,
                price_level=2,
                cuisine_tags=["Indian", "Fusion"],
                dietary_tags=["Vegan Options", "Vegetarian Friendly"],
                ambiance_tags=["Casual", "Family Friendly"],
                transactions=["pickup", "delivery"],
                hours=[{"day": "Mon-Sun", "open": "11:00", "close": "22:00"}],
            ).insert()

        if await Review.find_one(
            Review.user_id == demo_user.id, Review.restaurant_id == restaurant.id
        ) is None:
            review = await Review(
                user_id=demo_user.id,
                restaurant_id=restaurant.id,
                rating=5,
                body="Great flavors and quick service. Good vegan choices too.",
            ).insert()
        else:
            review = await Review.find_one(
                Review.user_id == demo_user.id, Review.restaurant_id == restaurant.id
            )

        if await Favorite.find_one(
            Favorite.user_id == demo_user.id, Favorite.restaurant_id == restaurant.id
        ) is None:
            await Favorite(user_id=demo_user.id, restaurant_id=restaurant.id).insert()

        if await UserPreference.find_one(UserPreference.user_id == demo_user.id) is None:
            await UserPreference(
                user_id=demo_user.id,
                default_city="San Jose",
                price_level=2,
                cuisine_tags=["Indian", "Thai"],
            ).insert()

        if await UserHistory.find_one(
            UserHistory.user_id == demo_user.id, UserHistory.restaurant_id == restaurant.id
        ) is None:
            await UserHistory(
                user_id=demo_user.id,
                restaurant_id=restaurant.id,
                action=HISTORY_RESTAURANT_VIEW,
            ).insert()

        if await RestaurantPhoto.find_one(
            RestaurantPhoto.restaurant_id == restaurant.id
        ) is None:
            await RestaurantPhoto(
                restaurant_id=restaurant.id,
                photo_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
                sort_order=1,
            ).insert()

        if review and await ReviewPhoto.find_one(ReviewPhoto.review_id == review.id) is None:
            await ReviewPhoto(
                review_id=review.id,
                photo_url="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",
            ).insert()

        if await RestaurantClaim.find_one(
            RestaurantClaim.user_id == owner_user.id,
            RestaurantClaim.restaurant_id == restaurant.id,
        ) is None:
            await RestaurantClaim(
                user_id=owner_user.id,
                restaurant_id=restaurant.id,
                status=ClaimStatus.approved,
                message="Business ownership verification documents submitted.",
            ).insert()

        # Session collection + TTL is required by Lab 2.
        if await Session.find_one(Session.user_id == demo_user.id) is None:
            await Session(
                user_id=demo_user.id,
                token="seed-demo-session-token",
                expires_at=utc_now() + timedelta(days=7),
            ).insert()

        imported_count = await _import_yelp_restaurants(DEFAULT_PER_CITY)

        print("Seed completed.")
        print("User login: demo@example.com / demo1234")
        print("Owner login: owner@example.com / owner1234")
        if imported_count:
            print(f"Imported from Yelp: {imported_count} restaurants")
        else:
            print("Imported from Yelp: 0 (missing/invalid key or API unavailable)")
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
