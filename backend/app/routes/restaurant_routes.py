"""Restaurant browse, CRUD, Yelp import, and business claims."""

from typing import Union

from fastapi import APIRouter, Body, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.exceptions import AppHTTPException
from app.db.database import get_db
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.claim_schema import ClaimOnRestaurantBody, ClaimResponse
from app.schemas.restaurant_schema import (
    PaginatedRestaurantCards,
    PaginatedRestaurantFull,
    RestaurantCreate,
    RestaurantResponse,
    RestaurantUpdate,
    YelpImportRequest,
)
from app.services import restaurant_service, yelp_fusion_service
from app.utils.filters import RESTAURANT_LIST_MAX_LIMIT, RestaurantSearchParams, parse_restaurant_search_params

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


def restaurant_search_params(
    query: str | None = Query(None, description="Broad text: name, description, city, address"),
    city: str | None = Query(None),
    postal_zip: str | None = Query(None, alias="zip"),
    cuisine: str | None = Query(None, description="Matches name, description, or cuisine tags"),
    keyword: str | None = Query(None, description="Extra text filter (AND with query when both set)"),
    price: int | None = Query(None, ge=1, le=4, description="Price bucket 1–4"),
    rating: float | None = Query(None, ge=0, le=5, description="Minimum average rating"),
    dietary: str | None = Query(None, description="Searches dietary_tags JSON"),
    ambiance: str | None = Query(None, description="Searches ambiance_tags JSON"),
    sort_by: str = Query(
        "rating_desc",
        description="rating_desc | rating_asc | name_asc | name_desc | newest",
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=RESTAURANT_LIST_MAX_LIMIT),
    full: bool = Query(
        False,
        description="If true, each item includes all restaurant fields (same shape as GET /restaurants/{id}).",
    ),
    open_now: bool = Query(
        False,
        description="If true, only businesses open right now (uses stored hours + timezone from city).",
    ),
) -> RestaurantSearchParams:
    return parse_restaurant_search_params(
        query=query,
        city=city,
        zip=postal_zip,
        cuisine=cuisine,
        keyword=keyword,
        price=price,
        rating=rating,
        dietary=dietary,
        ambiance=ambiance,
        sort_by=sort_by,
        page=page,
        limit=limit,
        full=full,
        open_now=open_now,
    )


@router.get(
    "",
    response_model=Union[PaginatedRestaurantCards, PaginatedRestaurantFull],
    summary="Search restaurants (local DB)",
    description=(
        "Returns active restaurants from your database. Omit `city` to search all cities. "
        "Use `page` and `limit` for pagination (up to 500 per page). "
        "Set `full=true` to receive full detail objects per row (hours, photos, yelp_url, …)."
    ),
)
def list_restaurants(
    db: Session = Depends(get_db),
    params: RestaurantSearchParams = Depends(restaurant_search_params),
) -> PaginatedRestaurantCards | PaginatedRestaurantFull:
    return restaurant_service.search_restaurants(db, params)


@router.get(
    "/yelp",
    summary="Search Yelp Fusion (live proxy)",
    description=(
        "Calls Yelp ``GET /v3/businesses/search`` using ``YELP_API_KEY``. "
        "Response matches the common lab shape: ``{ \"restaurants\": [ { id, yelp_id, name, "
        "cuisine_type, address, city, … } ] }`` — same fields you would map into MySQL after import."
    ),
    tags=["Restaurants", "Yelp"],
)
def yelp_search_proxy(
    term: str | None = Query(None, description="e.g. restaurants, pizza, sushi"),
    city: str | None = Query(None, description="City or ZIP, e.g. San Jose, CA"),
    limit: int = Query(20, ge=1, le=50),
    page: int = Query(1, ge=1, description="1-based page; offset = (page-1)*limit (capped by Yelp max 1000 results)."),
    price: int | None = Query(None, ge=1, le=4, description="Optional Yelp price filter 1–4."),
    sort_by: str | None = Query(
        None,
        description="Yelp sort: best_match | rating | review_count | distance",
    ),
    open_now: bool = Query(
        False,
        description="Yelp Fusion: only businesses open now (same location as ``city``).",
    ),
) -> dict:
    search_term = (term or "restaurants").strip()
    location = (city or "San Jose, CA").strip()
    lim = limit
    offset = min((page - 1) * lim, max(0, 1000 - lim))
    raw_hits, total = yelp_fusion_service.search_yelp_businesses_strict(
        term=search_term,
        location=location,
        limit=lim,
        offset=offset,
        price=price,
        sort_by=sort_by,
        open_now=open_now,
    )
    restaurants = [yelp_fusion_service.transform_yelp_search_hit(b) for b in raw_hits]
    return {
        "restaurants": restaurants,
        "total": total,
        "page": page,
        "limit": lim,
        "offset": offset,
    }


@router.get(
    "/yelp/{yelp_id}",
    summary="Yelp Fusion business detail (live proxy)",
    description=(
        "Calls Yelp ``GET /v3/businesses/{{id}}``. Same JSON shape as typical lab detail endpoints "
        "(plus ``latitude``, ``longitude``, ``hours`` for parity with stored rows). "
        "Use ``persist=true`` while authenticated to upsert into MySQL (same as "
        "``POST /restaurants/import-from-yelp``)."
    ),
    tags=["Restaurants", "Yelp"],
)
def yelp_business_detail_proxy(
    yelp_id: str,
    persist: bool = Query(
        False,
        description="Upsert this business into the local database (requires Bearer token).",
    ),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> dict:
    yid = yelp_id.strip()
    raw = yelp_fusion_service.fetch_business_details(yid)
    out = yelp_fusion_service.transform_yelp_detail_public(raw)
    row = db.execute(select(Restaurant).where(Restaurant.yelp_business_id == yid)).scalar_one_or_none()
    out["local_restaurant_id"] = row.id if row else None
    if persist:
        if user is None:
            raise AppHTTPException(
                status_code=401,
                detail="Authentication required when persist=true (send Authorization: Bearer <token>).",
            )
        restaurant_service.import_from_yelp(db, yid)
        row = db.execute(select(Restaurant).where(Restaurant.yelp_business_id == yid)).scalar_one_or_none()
        out["saved_to_database"] = True
        out["local_restaurant_id"] = row.id if row else None
    return out


@router.post(
    "/import-from-yelp",
    response_model=RestaurantResponse,
    summary="Import or refresh a business from Yelp Fusion",
    description="Fetches Yelp by business id, normalizes fields, and upserts into your MySQL database.",
)
def import_from_yelp(
    body: YelpImportRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> RestaurantResponse:
    return restaurant_service.import_from_yelp(db, body.yelp_business_id)


@router.get("/{restaurant_id}", response_model=RestaurantResponse, summary="Restaurant details")
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)) -> RestaurantResponse:
    row = restaurant_service.get_restaurant_by_id(db, restaurant_id)
    return restaurant_service.restaurant_to_response(row)


@router.post(
    "",
    response_model=RestaurantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a restaurant listing",
)
def create_restaurant(
    body: RestaurantCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RestaurantResponse:
    return restaurant_service.create_restaurant(db, user, body)


@router.put("/{restaurant_id}", response_model=RestaurantResponse, summary="Edit my restaurant")
def update_restaurant(
    restaurant_id: int,
    body: RestaurantUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RestaurantResponse:
    return restaurant_service.update_restaurant(db, user, restaurant_id, body)


@router.delete("/{restaurant_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete my restaurant")
def delete_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    restaurant_service.delete_restaurant(db, user, restaurant_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{restaurant_id}/claim",
    response_model=ClaimResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request to claim this business (pending review)",
)
def claim_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    body: ClaimOnRestaurantBody = Body(default_factory=ClaimOnRestaurantBody),
) -> ClaimResponse:
    return restaurant_service.create_claim(db, user, restaurant_id, body.message)
