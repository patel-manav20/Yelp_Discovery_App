"""Parse and validate restaurant list query parameters (search / browse)."""

from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException, status

AllowedSort = Literal["rating_desc", "rating_asc", "name_asc", "name_desc", "newest"]


# Max page size for GET /restaurants (use pagination for larger result sets).
RESTAURANT_LIST_MAX_LIMIT = 500


@dataclass
class RestaurantSearchParams:
    """Normalized filters for DB search (local restaurants only)."""

    query: str | None
    city: str | None
    zip: str | None
    cuisine: str | None
    keyword: str | None
    price: int | None  # 1–4
    rating: float | None  # minimum average_rating
    dietary: str | None
    ambiance: str | None
    sort_by: AllowedSort
    page: int
    limit: int
    full: bool  # when True, list endpoint returns full RestaurantResponse rows
    open_now: bool  # keep only businesses open in the search area's local time (hours JSON)


def _clean(s: str | None) -> str | None:
    if s is None:
        return None
    t = s.strip()
    return t if t else None


def parse_restaurant_search_params(
    *,
    query: str | None = None,
    city: str | None = None,
    zip: str | None = None,
    cuisine: str | None = None,
    keyword: str | None = None,
    price: int | None = None,
    rating: float | None = None,
    dietary: str | None = None,
    ambiance: str | None = None,
    sort_by: str = "rating_desc",
    page: int = 1,
    limit: int = 20,
    full: bool = False,
    open_now: bool = False,
) -> RestaurantSearchParams:
    allowed_sorts = {"rating_desc", "rating_asc", "name_asc", "name_desc", "newest"}
    if sort_by not in allowed_sorts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"sort_by must be one of: {', '.join(sorted(allowed_sorts))}",
        )
    if page < 1:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="page must be >= 1")
    if limit < 1 or limit > RESTAURANT_LIST_MAX_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"limit must be between 1 and {RESTAURANT_LIST_MAX_LIMIT}",
        )
    if price is not None and (price < 1 or price > 4):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="price must be between 1 and 4 (Yelp-style dollar buckets)",
        )
    if rating is not None and (rating < 0 or rating > 5):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="rating must be between 0 and 5",
        )

    return RestaurantSearchParams(
        query=_clean(query),
        city=_clean(city),
        zip=_clean(zip),
        cuisine=_clean(cuisine),
        keyword=_clean(keyword),
        price=price,
        rating=rating,
        dietary=_clean(dietary),
        ambiance=_clean(ambiance),
        sort_by=sort_by,  # type: ignore[assignment]
        page=page,
        limit=limit,
        full=full,
        open_now=open_now,
    )


def like_fragment(raw: str) -> str:
    """Make a safe-ish LIKE pattern (strip wildcards from user input)."""
    cleaned = raw.replace("%", "").replace("_", "").strip()
    return f"%{cleaned.lower()}%" if cleaned else "%"
