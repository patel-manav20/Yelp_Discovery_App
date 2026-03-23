"""Restaurant CRUD, local search, Yelp import, and owner claims."""

import time
from typing import Any

from sqlalchemy import String, and_, cast, delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.exceptions import AppHTTPException
from app.models.restaurant import Restaurant, RestaurantSourceType
from app.models.restaurant_claim import ClaimStatus, RestaurantClaim
from app.models.restaurant_photo import RestaurantPhoto
from app.models.user import User, UserRole
from app.schemas.claim_schema import ClaimResponse
from app.schemas.restaurant_schema import (
    PaginatedRestaurantCards,
    PaginatedRestaurantFull,
    RestaurantCreate,
    RestaurantPhotoResponse,
    RestaurantResponse,
    RestaurantSummary,
    RestaurantUpdate,
)
from app.services import yelp_fusion_service
from app.utils.filters import RestaurantSearchParams, like_fragment
from app.utils.open_now import tz_for_search_city, yelp_hours_open_now

# Max rows scanned when ``open_now`` is true (filter in app; city/other SQL filters still apply).
OPEN_NOW_SCAN_CAP = 2000


def _assert_owner(restaurant: Restaurant, user: User) -> None:
    if restaurant.owner_user_id is None or restaurant.owner_user_id != user.id:
        raise AppHTTPException(
            status_code=403,
            detail="You can only change restaurants that you own.",
        )


def _filter_conditions(params: RestaurantSearchParams) -> list:
    conds: list = [Restaurant.is_active.is_(True)]

    text_groups = []
    if params.query:
        pat = like_fragment(params.query)
        text_groups.append(
            or_(
                func.lower(Restaurant.name).like(pat),
                func.lower(func.coalesce(Restaurant.description, "")).like(pat),
                func.lower(Restaurant.city).like(pat),
                func.lower(func.coalesce(Restaurant.address_line, "")).like(pat),
            )
        )
    if params.keyword:
        pat = like_fragment(params.keyword)
        text_groups.append(
            or_(
                func.lower(Restaurant.name).like(pat),
                func.lower(func.coalesce(Restaurant.description, "")).like(pat),
                func.lower(Restaurant.city).like(pat),
                func.lower(func.coalesce(Restaurant.address_line, "")).like(pat),
            )
        )
    if text_groups:
        conds.append(and_(*text_groups))

    if params.city:
        conds.append(func.lower(Restaurant.city).like(like_fragment(params.city)))

    if params.zip:
        conds.append(Restaurant.postal_code == params.zip.strip())

    if params.cuisine:
        pat = like_fragment(params.cuisine)
        conds.append(
            or_(
                func.lower(Restaurant.name).like(pat),
                func.lower(func.coalesce(Restaurant.description, "")).like(pat),
                func.lower(cast(Restaurant.cuisine_tags, String)).like(pat),
            )
        )

    if params.dietary:
        pat = like_fragment(params.dietary)
        conds.append(func.lower(cast(Restaurant.dietary_tags, String)).like(pat))

    if params.ambiance:
        pat = like_fragment(params.ambiance)
        conds.append(func.lower(cast(Restaurant.ambiance_tags, String)).like(pat))

    if params.price is not None:
        conds.append(Restaurant.price_level == params.price)

    if params.rating is not None:
        conds.append(Restaurant.average_rating >= params.rating)

    return conds


def _order_by_clause(sort_by: str):
    if sort_by == "rating_desc":
        return (Restaurant.average_rating.desc(), Restaurant.review_count.desc())
    if sort_by == "rating_asc":
        return (Restaurant.average_rating.asc(), Restaurant.review_count.asc())
    if sort_by == "name_asc":
        return (Restaurant.name.asc(),)
    if sort_by == "name_desc":
        return (Restaurant.name.desc(),)
    if sort_by == "newest":
        return (Restaurant.created_at.desc(),)
    return (Restaurant.average_rating.desc(), Restaurant.review_count.desc())


def _sort_restaurant_rows_inplace(rows: list[Restaurant], sort_by: str) -> None:
    if sort_by == "rating_desc":
        rows.sort(key=lambda r: (-(r.average_rating or 0.0), -(r.review_count or 0)))
    elif sort_by == "rating_asc":
        rows.sort(key=lambda r: ((r.average_rating or 0.0), (r.review_count or 0)))
    elif sort_by == "name_asc":
        rows.sort(key=lambda r: (r.name or "").lower())
    elif sort_by == "name_desc":
        rows.sort(key=lambda r: (r.name or "").lower(), reverse=True)
    elif sort_by == "newest":
        rows.sort(key=lambda r: r.created_at, reverse=True)
    else:
        rows.sort(key=lambda r: (-(r.average_rating or 0.0), -(r.review_count or 0)))


def restaurant_to_summary(restaurant: Restaurant) -> RestaurantSummary:
    base = RestaurantSummary.model_validate(restaurant)
    photos_sorted = sorted(restaurant.photos, key=lambda p: (p.sort_order, p.id))
    primary = photos_sorted[0].photo_url if photos_sorted else None
    cuisines = list(restaurant.cuisine_tags)[:4] if restaurant.cuisine_tags else None
    desc = restaurant.description
    if desc and len(desc) > 200:
        desc = desc[:197].rstrip() + "…"
    return base.model_copy(
        update={"primary_photo_url": primary, "cuisine_tags": cuisines, "description": desc}
    )


def restaurant_to_response(restaurant: Restaurant) -> RestaurantResponse:
    photos_sorted = sorted(restaurant.photos, key=lambda p: (p.sort_order, p.id))
    resp = RestaurantResponse.model_validate(restaurant)
    return resp.model_copy(
        update={"photos": [RestaurantPhotoResponse.model_validate(p) for p in photos_sorted]}
    )


def search_restaurants(
    db: Session, params: RestaurantSearchParams
) -> PaginatedRestaurantCards | PaginatedRestaurantFull:
    conds = _filter_conditions(params)

    if params.open_now:
        tz = tz_for_search_city(params.city)
        stmt_scan = (
            select(Restaurant)
            .where(*conds)
            .options(selectinload(Restaurant.photos))
            .order_by(*_order_by_clause(params.sort_by))
            .limit(OPEN_NOW_SCAN_CAP)
        )
        candidates = list(db.scalars(stmt_scan).unique().all())
        open_rows = [r for r in candidates if yelp_hours_open_now(r.hours, tz)]
        _sort_restaurant_rows_inplace(open_rows, params.sort_by)
        total = len(open_rows)
        start = (params.page - 1) * params.limit
        rows = open_rows[start : start + params.limit]
    else:
        total = db.scalar(select(func.count()).select_from(Restaurant).where(*conds)) or 0
        stmt = (
            select(Restaurant)
            .where(*conds)
            .options(selectinload(Restaurant.photos))
            .order_by(*_order_by_clause(params.sort_by))
            .offset((params.page - 1) * params.limit)
            .limit(params.limit)
        )
        rows = list(db.scalars(stmt).unique().all())

    if params.full:
        items = [restaurant_to_response(r) for r in rows]
        return PaginatedRestaurantFull(items=items, page=params.page, limit=params.limit, total=total)
    items = [restaurant_to_summary(r) for r in rows]
    return PaginatedRestaurantCards(items=items, page=params.page, limit=params.limit, total=total)


def get_restaurant_by_id(db: Session, restaurant_id: int) -> Restaurant:
    stmt = (
        select(Restaurant)
        .where(Restaurant.id == restaurant_id, Restaurant.is_active.is_(True))
        .options(selectinload(Restaurant.photos))
    )
    row = db.execute(stmt).scalar_one_or_none()
    if row is None:
        raise AppHTTPException(status_code=404, detail="Restaurant not found.")
    return row


def create_restaurant(db: Session, user: User, body: RestaurantCreate) -> RestaurantResponse:
    data = body.model_dump(exclude={"photo_urls"}, exclude_unset=False)
    photo_urls = body.photo_urls or []

    restaurant = Restaurant(
        **data,
        owner_user_id=user.id,
        is_claimed=False,
        average_rating=0.0,
        review_count=0,
    )
    db.add(restaurant)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise AppHTTPException(
            status_code=409,
            detail="Could not create restaurant (duplicate Yelp id or other conflict).",
        ) from None

    _add_photos(db, restaurant, photo_urls)
    db.commit()
    stmt = select(Restaurant).where(Restaurant.id == restaurant.id).options(selectinload(Restaurant.photos))
    row = db.execute(stmt).scalar_one()
    return restaurant_to_response(row)


def _add_photos(
    db: Session,
    restaurant: Restaurant,
    urls: list[str],
    *,
    max_photos: int | None = 10,
) -> None:
    deduped: list[str] = []
    seen: set[str] = set()
    for url in urls:
        u = url.strip()
        if u and u not in seen:
            seen.add(u)
            deduped.append(u)
    if max_photos is not None:
        deduped = deduped[:max_photos]
    for order, u in enumerate(deduped):
        db.add(
            RestaurantPhoto(
                restaurant_id=restaurant.id,
                photo_url=u,
                sort_order=order,
            )
        )


def update_restaurant(db: Session, user: User, restaurant_id: int, body: RestaurantUpdate) -> RestaurantResponse:
    restaurant = db.get(Restaurant, restaurant_id)
    if restaurant is None or not restaurant.is_active:
        raise AppHTTPException(status_code=404, detail="Restaurant not found.")
    _assert_owner(restaurant, user)

    patch = body.model_dump(exclude_unset=True)
    photo_urls = patch.pop("photo_urls", None)
    for key, value in patch.items():
        setattr(restaurant, key, value)

    if photo_urls is not None:
        db.execute(delete(RestaurantPhoto).where(RestaurantPhoto.restaurant_id == restaurant.id))
        _add_photos(db, restaurant, photo_urls)

    db.commit()
    db.refresh(restaurant)
    stmt = (
        select(Restaurant)
        .where(Restaurant.id == restaurant.id)
        .options(selectinload(Restaurant.photos))
    )
    row = db.execute(stmt).scalar_one()
    return restaurant_to_response(row)


def delete_restaurant(db: Session, user: User, restaurant_id: int) -> None:
    restaurant = db.get(Restaurant, restaurant_id)
    if restaurant is None:
        raise AppHTTPException(status_code=404, detail="Restaurant not found.")
    _assert_owner(restaurant, user)
    db.delete(restaurant)
    db.commit()


def import_from_yelp(db: Session, yelp_business_id: str) -> RestaurantResponse:
    raw = yelp_fusion_service.fetch_business_details(yelp_business_id)
    snapshot = yelp_fusion_service.yelp_fusion_json_safe(raw)
    normalized = yelp_fusion_service.normalize_yelp_business(raw)
    yid = normalized.get("yelp_business_id") or ""
    if not yid:
        raise AppHTTPException(status_code=502, detail="Yelp response did not include a business id.")

    photo_urls = normalized.pop("photo_urls", []) or []
    is_closed = bool(normalized.pop("is_closed", False))

    existing = db.execute(
        select(Restaurant).where(Restaurant.yelp_business_id == yid)
    ).scalar_one_or_none()

    if existing:
        for key in (
            "name",
            "description",
            "address_line",
            "city",
            "state",
            "postal_code",
            "country",
            "phone",
            "website_url",
            "latitude",
            "longitude",
            "average_rating",
            "review_count",
            "price_level",
            "cuisine_tags",
            "dietary_tags",
            "ambiance_tags",
            "yelp_url",
            "hours",
            "transactions",
        ):
            if key in normalized:
                setattr(existing, key, normalized[key])
        existing.yelp_fusion_snapshot = snapshot
        existing.source_type = RestaurantSourceType.yelp_fusion
        existing.is_active = not is_closed
        db.execute(delete(RestaurantPhoto).where(RestaurantPhoto.restaurant_id == existing.id))
        _add_photos(db, existing, photo_urls, max_photos=None)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise AppHTTPException(status_code=409, detail="Could not save imported restaurant.") from None
        db.refresh(existing)
        stmt = select(Restaurant).where(Restaurant.id == existing.id).options(selectinload(Restaurant.photos))
        row = db.execute(stmt).scalar_one()
        return restaurant_to_response(row)

    restaurant = Restaurant(
        yelp_business_id=yid,
        source_type=RestaurantSourceType.yelp_fusion,
        owner_user_id=None,
        is_claimed=False,
        is_active=not is_closed,
        name=normalized["name"],
        description=normalized.get("description"),
        address_line=normalized.get("address_line"),
        city=normalized["city"],
        state=normalized.get("state"),
        postal_code=normalized.get("postal_code"),
        country=normalized.get("country") or "US",
        phone=normalized.get("phone"),
        website_url=normalized.get("website_url"),
        latitude=normalized.get("latitude"),
        longitude=normalized.get("longitude"),
        average_rating=normalized.get("average_rating") or 0.0,
        review_count=normalized.get("review_count") or 0,
        price_level=normalized.get("price_level"),
        cuisine_tags=normalized.get("cuisine_tags"),
        dietary_tags=normalized.get("dietary_tags"),
        ambiance_tags=normalized.get("ambiance_tags"),
        yelp_url=normalized.get("yelp_url"),
        hours=normalized.get("hours"),
        transactions=normalized.get("transactions"),
        yelp_fusion_snapshot=snapshot,
    )
    db.add(restaurant)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise AppHTTPException(
            status_code=409,
            detail="This Yelp business is already linked to another row.",
        ) from None

    _add_photos(db, restaurant, photo_urls, max_photos=None)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppHTTPException(status_code=409, detail="Could not save imported restaurant.") from None

    db.refresh(restaurant)
    stmt = select(Restaurant).where(Restaurant.id == restaurant.id).options(selectinload(Restaurant.photos))
    row = db.execute(stmt).scalar_one()
    return restaurant_to_response(row)


def bulk_import_yelp_search(
    db: Session,
    *,
    terms: list[str],
    locations: list[str] | None = None,
    location: str | None = None,
    coordinate_searches: list[tuple[float, float, int]] | None = None,
    max_total: int = 50,
    delay_seconds: float = 0.2,
    search_delay_seconds: float = 0.0,
    geo_first: bool = False,
    skip_location_search: bool = False,
) -> dict[str, Any]:
    """
    Paginate Yelp business search across multiple location strings and/or lat/lng
    circles, then GET /businesses/{{id}} for each id and upsert via
    ``import_from_yelp`` (hours, photos, transactions, etc.).

    Duplicate businesses are deduped by Yelp id across all queries. Each distinct
    search can still return at most ~1000 hits (Yelp cap); multiple locations and
    coordinate grids broaden geographic coverage.

    Set ``geo_first=True`` to run coordinate searches before string locations so a
    low ``max_total`` does not fill entirely from the first city name alone.
    ``skip_location_search=True`` uses only ``coordinate_searches`` (must be non-empty).

    Requires ``YELP_API_KEY``. ``search_delay_seconds`` spaces out search paging;
    ``delay_seconds`` spaces out business-detail calls.
    """
    if not (settings.yelp_api_key or "").strip():
        raise AppHTTPException(
            status_code=503,
            detail="Set YELP_API_KEY in the environment to import from Yelp.",
        )

    loc_list: list[str] = []
    if not skip_location_search:
        loc_list = [x.strip() for x in (locations or []) if x and str(x).strip()]
        if not loc_list and location and str(location).strip():
            loc_list = [location.strip()]
        if not loc_list:
            loc_list = ["San Jose, CA"]

    coord_list = list(coordinate_searches or [])
    if not loc_list and not coord_list:
        raise AppHTTPException(
            status_code=400,
            detail="Provide at least one location or coordinate search (or disable skip_location_search).",
        )

    clean_terms = [t.strip() for t in terms if t and str(t).strip()] or ["restaurants"]

    collected_ids: list[str] = []
    seen: set[str] = set()

    def _sleep_search() -> None:
        if search_delay_seconds > 0:
            time.sleep(search_delay_seconds)

    def _collect_from_location(loc: str) -> None:
        for term in clean_terms:
            if len(collected_ids) >= max_total:
                break
            offset = 0
            while len(collected_ids) < max_total and offset < 1000:
                need = min(50, max_total - len(collected_ids))
                batch = yelp_fusion_service.search_yelp_businesses(
                    term=term,
                    location=loc,
                    limit=need,
                    offset=offset,
                )
                _sleep_search()
                if not batch:
                    break
                for b in batch:
                    if not isinstance(b, dict):
                        continue
                    yid = (b.get("id") or "").strip()
                    if yid and yid not in seen:
                        seen.add(yid)
                        collected_ids.append(yid)
                        if len(collected_ids) >= max_total:
                            break
                offset += len(batch)
                if len(batch) < need:
                    break

    def _collect_from_coords(lat: float, lng: float, radius_m: int) -> None:
        for term in clean_terms:
            if len(collected_ids) >= max_total:
                break
            offset = 0
            while len(collected_ids) < max_total and offset < 1000:
                need = min(50, max_total - len(collected_ids))
                batch = yelp_fusion_service.search_yelp_businesses(
                    term=term,
                    latitude=lat,
                    longitude=lng,
                    radius_meters=radius_m,
                    limit=need,
                    offset=offset,
                )
                _sleep_search()
                if not batch:
                    break
                for b in batch:
                    if not isinstance(b, dict):
                        continue
                    yid = (b.get("id") or "").strip()
                    if yid and yid not in seen:
                        seen.add(yid)
                        collected_ids.append(yid)
                        if len(collected_ids) >= max_total:
                            break
                offset += len(batch)
                if len(batch) < need:
                    break

    phases: list[tuple[str, Any]] = []
    if geo_first:
        phases.extend([("coords", c) for c in coord_list])
        phases.extend([("loc", loc) for loc in loc_list])
    else:
        phases.extend([("loc", loc) for loc in loc_list])
        phases.extend([("coords", c) for c in coord_list])

    for kind, payload in phases:
        if len(collected_ids) >= max_total:
            break
        if kind == "loc":
            _collect_from_location(str(payload))
        else:
            lat, lng, radius_m = payload
            _collect_from_coords(lat, lng, radius_m)

    imported = 0
    updated = 0
    failed: list[dict[str, str]] = []

    for yid in collected_ids:
        existed = db.execute(
            select(Restaurant).where(Restaurant.yelp_business_id == yid)
        ).scalar_one_or_none()
        try:
            import_from_yelp(db, yid)
            if existed:
                updated += 1
            else:
                imported += 1
        except AppHTTPException as exc:
            failed.append({"id": yid, "detail": str(exc.detail)})
        except Exception as exc:  # pragma: no cover
            failed.append({"id": yid, "detail": f"{type(exc).__name__}: {exc}"})
        if delay_seconds > 0:
            time.sleep(delay_seconds)

    return {
        "locations": loc_list,
        "coordinate_search_centers": len(coord_list),
        "terms": clean_terms,
        "requested": len(collected_ids),
        "imported_new": imported,
        "updated_existing": updated,
        "failed": failed,
    }


def create_claim(
    db: Session,
    user: User,
    restaurant_id: int,
    message: str | None,
) -> ClaimResponse:
    if user.role != UserRole.owner:
        raise AppHTTPException(
            status_code=403,
            detail="Only accounts with the owner role can claim a business.",
        )

    restaurant = db.get(Restaurant, restaurant_id)
    if restaurant is None or not restaurant.is_active:
        raise AppHTTPException(status_code=404, detail="Restaurant not found.")

    if restaurant.owner_user_id is not None:
        raise AppHTTPException(
            status_code=400,
            detail="This listing already has an owner assigned.",
        )

    pending = db.execute(
        select(RestaurantClaim).where(
            RestaurantClaim.user_id == user.id,
            RestaurantClaim.restaurant_id == restaurant_id,
            RestaurantClaim.status == ClaimStatus.pending,
        )
    ).scalar_one_or_none()
    if pending is not None:
        raise AppHTTPException(
            status_code=409,
            detail="You already have a pending claim for this restaurant.",
        )

    claim = RestaurantClaim(
        user_id=user.id,
        restaurant_id=restaurant_id,
        status=ClaimStatus.pending,
        message=message.strip() if message else None,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return ClaimResponse.model_validate(claim)
