"""Kafka consumer handlers for write-side persistence."""

from __future__ import annotations

from uuid import uuid4

from beanie import PydanticObjectId

from app.models.restaurant import Restaurant, RestaurantSourceType
from app.models.restaurant_claim import ClaimStatus, RestaurantClaim
from app.models.restaurant_photo import RestaurantPhoto
from app.models.review import Review
from app.models.user import User, UserRole
from app.kafka.producer import kafka_producer
from app.kafka.topics import BOOKING_STATUS


async def _recalculate_restaurant_rating(restaurant_id: PydanticObjectId) -> None:
    restaurant = await Restaurant.get(restaurant_id)
    if restaurant is None:
        return
    rows = await Review.find(Review.restaurant_id == restaurant_id).to_list()
    total = len(rows)
    avg = (sum(r.rating for r in rows) / total) if total else 0.0
    restaurant.average_rating = round(float(avg), 2)
    restaurant.review_count = total
    await restaurant.save()


async def _publish_status(entity: str, action: str, status: str, data: dict) -> None:
    payload = {"entity": entity, "action": action, "status": status, "data": data}
    try:
        await kafka_producer.send(BOOKING_STATUS, key=entity, value=payload)
    except Exception:  # noqa: BLE001
        # Status topic is best-effort; do not break primary writes.
        pass


async def _sync_restaurant_photos(restaurant_id: PydanticObjectId, photo_urls: list[str] | None) -> None:
    if photo_urls is None:
        return
    deduped: list[str] = []
    seen: set[str] = set()
    for raw in photo_urls:
        url = str(raw or "").strip()
        if url and url not in seen:
            seen.add(url)
            deduped.append(url)
    deduped = deduped[:10]

    await RestaurantPhoto.find(RestaurantPhoto.restaurant_id == restaurant_id).delete()
    for idx, url in enumerate(deduped):
        await RestaurantPhoto(restaurant_id=restaurant_id, photo_url=url, sort_order=idx).insert()


async def handle_review_created(data: dict) -> None:
    user_id = PydanticObjectId(data["user_id"])
    restaurant_id = PydanticObjectId(data["restaurant_id"])
    existing = await Review.find_one(Review.user_id == user_id, Review.restaurant_id == restaurant_id)
    if existing is not None:
        return
    review = Review(
        user_id=user_id,
        restaurant_id=restaurant_id,
        rating=int(data["rating"]),
        body=data.get("body"),
    )
    await review.insert()
    await _recalculate_restaurant_rating(restaurant_id)
    restaurant = await Restaurant.get(restaurant_id)
    if restaurant and restaurant.owner_user_id and str(restaurant.owner_user_id) != data["user_id"]:
        from app.models.user_history import HISTORY_OWNER_REVIEW_CREATE
        from app.services.user_service import record_history

        await record_history(
            user_id=restaurant.owner_user_id,
            action=HISTORY_OWNER_REVIEW_CREATE,
            restaurant_id=restaurant_id,
            detail=data.get("body") or f"New {int(data['rating'])}-star review on your listing.",
        )
    await _publish_status("review", "created", "processed", {"restaurant_id": data["restaurant_id"]})


async def handle_review_updated(data: dict) -> None:
    review = await Review.get(PydanticObjectId(data["review_id"]))
    if review is None:
        return
    if "rating" in data and data["rating"] is not None:
        review.rating = int(data["rating"])
    if "body" in data:
        review.body = data.get("body")
    await review.save()
    await _recalculate_restaurant_rating(review.restaurant_id)
    restaurant = await Restaurant.get(review.restaurant_id)
    if restaurant and restaurant.owner_user_id and str(restaurant.owner_user_id) != str(review.user_id):
        from app.models.user_history import HISTORY_OWNER_REVIEW_UPDATE
        from app.services.user_service import record_history

        await record_history(
            user_id=restaurant.owner_user_id,
            action=HISTORY_OWNER_REVIEW_UPDATE,
            restaurant_id=review.restaurant_id,
            detail=review.body or f"A diner updated their {review.rating}-star review.",
        )
    await _publish_status("review", "updated", "processed", {"review_id": data["review_id"]})


async def handle_review_deleted(data: dict) -> None:
    review = await Review.get(PydanticObjectId(data["review_id"]))
    if review is None:
        return
    rid = review.restaurant_id
    restaurant = await Restaurant.get(rid)
    deleted_body = review.body
    await review.delete()
    await _recalculate_restaurant_rating(rid)
    if restaurant and restaurant.owner_user_id and str(restaurant.owner_user_id) != str(review.user_id):
        from app.models.user_history import HISTORY_OWNER_REVIEW_DELETE
        from app.services.user_service import record_history

        await record_history(
            user_id=restaurant.owner_user_id,
            action=HISTORY_OWNER_REVIEW_DELETE,
            restaurant_id=rid,
            detail=deleted_body or "A diner deleted their review.",
        )
    await _publish_status("review", "deleted", "processed", {"review_id": data["review_id"]})


async def handle_restaurant_created(data: dict) -> None:
    yelp_business_id = data.get("yelp_business_id")
    if not yelp_business_id:
        yelp_business_id = f"local-{uuid4().hex}"
    restaurant = Restaurant(
        name=data["name"],
        description=data.get("description"),
        address_line=data.get("address_line"),
        city=data["city"],
        state=data.get("state"),
        postal_code=data.get("postal_code"),
        country=data.get("country") or "US",
        phone=data.get("phone"),
        website_url=data.get("website_url"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        source_type=RestaurantSourceType(data.get("source_type") or "local"),
        yelp_business_id=yelp_business_id,
        price_level=data.get("price_level"),
        cuisine_tags=data.get("cuisine_tags"),
        dietary_tags=data.get("dietary_tags"),
        ambiance_tags=data.get("ambiance_tags"),
        hours=data.get("hours"),
        owner_user_id=PydanticObjectId(data["owner_user_id"]) if data.get("owner_user_id") else None,
    )
    await restaurant.insert()
    await _sync_restaurant_photos(restaurant.id, data.get("photo_urls"))
    await _publish_status("restaurant", "created", "processed", {"name": data["name"]})


async def handle_restaurant_updated(data: dict) -> None:
    restaurant = await Restaurant.get(PydanticObjectId(data["restaurant_id"]))
    if restaurant is None:
        return
    patch = data.get("patch") or {}
    photo_urls = patch.pop("photo_urls", None)
    for key, value in patch.items():
        setattr(restaurant, key, value)
    await restaurant.save()
    await _sync_restaurant_photos(restaurant.id, photo_urls)
    await _publish_status("restaurant", "updated", "processed", {"restaurant_id": data["restaurant_id"]})


async def handle_restaurant_claimed(data: dict) -> None:
    claim = RestaurantClaim(
        user_id=PydanticObjectId(data["user_id"]),
        restaurant_id=PydanticObjectId(data["restaurant_id"]),
        status=ClaimStatus.pending,
        message=data.get("message"),
    )
    await claim.insert()
    await _publish_status("restaurant", "claimed", "processed", {"restaurant_id": data["restaurant_id"]})


async def handle_user_created(data: dict) -> None:
    exists = await User.find_one(User.email == data["email"])
    if exists is not None:
        return
    user = User(
        email=data["email"],
        password_hash=data["password_hash"],
        role=UserRole(data.get("role") or "user"),
        display_name=data["display_name"],
        phone=data.get("phone"),
        city=data.get("city"),
        state=data.get("state"),
        country=data.get("country"),
        bio=data.get("bio"),
        avatar_url=data.get("avatar_url"),
        languages=data.get("languages"),
        gender=data.get("gender"),
        is_active=bool(data.get("is_active", True)),
    )
    await user.insert()
    await _publish_status("user", "created", "processed", {"email": data["email"]})


async def handle_user_updated(data: dict) -> None:
    user = await User.get(PydanticObjectId(data["user_id"]))
    if user is None:
        return
    patch = data.get("patch") or {}
    for key, value in patch.items():
        setattr(user, key, value)
    await user.save()
    await _publish_status("user", "updated", "processed", {"user_id": data["user_id"]})
