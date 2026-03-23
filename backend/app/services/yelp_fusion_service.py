"""
Yelp Fusion API client (business details only for import).

Docs: https://docs.developer.yelp.com/docs/fusion-intro
"""

import json
import math
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import AppHTTPException

YELP_BUSINESS_URL = "https://api.yelp.com/v3/businesses/{business_id}"
YELP_SEARCH_URL = "https://api.yelp.com/v3/businesses/search"
YELP_MAX_SEARCH_RADIUS_M = 40_000


def transform_yelp_search_hit(b: dict[str, Any]) -> dict[str, Any]:
    """Fusion search hit: lab JSON + fields needed for Explore UI (map, grid, links)."""
    cats = b.get("categories") or []
    cuisine = "Restaurant"
    if isinstance(cats, list) and cats and isinstance(cats[0], dict):
        cuisine = cats[0].get("title", "Restaurant") or "Restaurant"
    loc = b.get("location") if isinstance(b.get("location"), dict) else {}
    image_url = b.get("image_url")
    photos = [image_url] if image_url else []
    coords = b.get("coordinates") if isinstance(b.get("coordinates"), dict) else {}
    cuisine_tags: list[str] = []
    if isinstance(cats, list):
        for c in cats:
            if isinstance(c, dict) and (t := (c.get("title") or "").strip()):
                cuisine_tags.append(t)
    raw_price = b.get("price")
    pr_str = raw_price if isinstance(raw_price, str) else "$$"
    yid = b.get("id")
    return {
        "id": yid,
        "yelp_id": yid,
        "name": b.get("name"),
        "cuisine_type": cuisine,
        "address": loc.get("address1"),
        "address_line": loc.get("address1"),
        "city": loc.get("city"),
        "state": loc.get("state"),
        "zip_code": loc.get("zip_code"),
        "country": loc.get("country"),
        "phone": b.get("phone"),
        "price_range": pr_str,
        "price_level": yelp_price_to_level(raw_price if isinstance(raw_price, str) else None),
        "average_rating": b.get("rating"),
        "review_count": b.get("review_count", 0),
        "photos": photos,
        "primary_photo_url": photos[0] if photos else None,
        "yelp_url": b.get("url"),
        "latitude": coords.get("latitude"),
        "longitude": coords.get("longitude"),
        "cuisine_tags": cuisine_tags or None,
        "is_closed": b.get("is_closed"),
        "source": "yelp_live",
    }


def transform_yelp_detail_public(b: dict[str, Any]) -> dict[str, Any]:
    """Shape aligned with lab-style ``GET /restaurants/yelp/{yelp_id}`` (Fusion business detail)."""
    cats = b.get("categories") or []
    cuisine = "Restaurant"
    cuisine_tags: list[str] = []
    if isinstance(cats, list):
        for c in cats:
            if isinstance(c, dict) and (t := (c.get("title") or "").strip()):
                cuisine_tags.append(t)
        if cats and isinstance(cats[0], dict):
            cuisine = cats[0].get("title", "Restaurant") or "Restaurant"
    loc = b.get("location") if isinstance(b.get("location"), dict) else {}
    photos_raw = b.get("photos")
    photos: list[str] = []
    if isinstance(photos_raw, list):
        photos = [p for p in photos_raw if isinstance(p, str) and p.strip()]
    if not photos and b.get("image_url"):
        photos = [b.get("image_url")]
    coords = b.get("coordinates") if isinstance(b.get("coordinates"), dict) else {}
    lat, lng = coords.get("latitude"), coords.get("longitude")
    website_url = _extract_website_url(b)
    addr1 = loc.get("address1")
    return {
        "id": b.get("id"),
        "yelp_id": b.get("id"),
        "name": b.get("name"),
        "cuisine_type": cuisine,
        "cuisine_tags": cuisine_tags or None,
        "address": addr1,
        "address_line": addr1,
        "city": loc.get("city"),
        "state": loc.get("state"),
        "zip_code": loc.get("zip_code"),
        "postal_code": loc.get("zip_code"),
        "country": loc.get("country"),
        "phone": b.get("display_phone") or b.get("phone"),
        "website_url": website_url,
        "price_range": b.get("price") or "$$",
        "average_rating": b.get("rating"),
        "review_count": b.get("review_count", 0),
        "photos": photos,
        "yelp_url": b.get("url"),
        "is_closed": b.get("is_closed"),
        "transactions": b.get("transactions") or [],
        "location_display": loc.get("display_address") or [],
        "latitude": lat,
        "longitude": lng,
        "hours": _parse_hours(b.get("hours")),
    }


def search_yelp_businesses_strict(
    *,
    term: str | None = None,
    location: str | None = None,
    limit: int = 20,
    offset: int = 0,
    price: int | None = None,
    sort_by: str | None = None,
    open_now: bool = False,
) -> tuple[list[dict[str, Any]], int]:
    """
    Fusion ``/businesses/search`` for HTTP handlers: raises ``AppHTTPException`` on
    config / HTTP errors. Returns ``(raw_business_dicts, total_reported_by_yelp)``.
    """
    key = (settings.yelp_api_key or "").strip()
    if not key:
        raise AppHTTPException(
            status_code=503,
            detail="YELP_API_KEY not configured. Set it in backend `.env`.",
        )

    lim = min(max(limit, 1), 50)
    off = min(max(offset, 0), max(0, 1000 - lim))
    loc = (location or "San Jose, CA").strip()
    params: dict[str, Any] = {"limit": lim, "location": loc, "offset": off}
    if term and term.strip():
        params["term"] = term.strip()
    if price is not None and 1 <= int(price) <= 4:
        params["price"] = str(int(price))
    sort = (sort_by or "best_match").strip()
    if sort in ("best_match", "rating", "review_count", "distance"):
        params["sort_by"] = sort
    if open_now:
        params["open_now"] = True

    headers = {"Authorization": f"Bearer {key}"}
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(YELP_SEARCH_URL, params=params, headers=headers)
    except httpx.RequestError as exc:
        raise AppHTTPException(
            status_code=503,
            detail=f"Could not reach Yelp ({type(exc).__name__}). Check your network.",
        ) from exc

    if response.status_code == 401:
        raise AppHTTPException(status_code=503, detail="Invalid or rejected Yelp API key.")
    if response.status_code != 200:
        raise AppHTTPException(
            status_code=502,
            detail=f"Yelp search returned status {response.status_code}.",
        )

    try:
        data = response.json()
    except ValueError:
        raise AppHTTPException(status_code=502, detail="Yelp returned invalid JSON.") from None

    businesses = data.get("businesses")
    if not isinstance(businesses, list):
        businesses = []
    raw_list = [b for b in businesses if isinstance(b, dict)]
    total_raw = data.get("total")
    try:
        total = int(total_raw) if total_raw is not None else len(raw_list)
    except (TypeError, ValueError):
        total = len(raw_list)
    return raw_list, max(0, total)


def geo_grid_points(
    south: float,
    west: float,
    north: float,
    east: float,
    *,
    radius_meters: int,
    max_points: int = 200,
) -> list[tuple[float, float]]:
    """
    Lat/lng circle centers covering a bounding box with slightly overlapping radii
    (for repeated Yelp ``latitude``/``longitude``/``radius`` searches). ``radius_meters``
    is capped at Yelp's 40 km limit. Stops after ``max_points``.
    """
    r = min(max(int(radius_meters), 100), YELP_MAX_SEARCH_RADIUS_M)
    if north <= south or east <= west or max_points <= 0:
        return []
    mid_lat = (south + north) / 2.0
    m_per_lat = 111_320.0
    m_per_lng = 111_320.0 * max(0.2, math.cos(math.radians(mid_lat)))
    step_lat = (r * 1.1) / m_per_lat
    step_lng = (r * 1.1) / m_per_lng
    if step_lat <= 0 or step_lng <= 0:
        return []
    pts: list[tuple[float, float]] = []
    lat = float(south)
    while lat <= north and len(pts) < max_points:
        lng = float(west)
        while lng <= east and len(pts) < max_points:
            pts.append((round(lat, 5), round(lng, 5)))
            lng += step_lng
        lat += step_lat
    return pts


def search_yelp_businesses(
    *,
    term: str | None = None,
    location: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_meters: int | None = None,
    limit: int = 10,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """
    Yelp Fusion business search. Returns [] if API key missing or on network errors
    (used as supplemental results for AI chat — failures are non-fatal).

    Use either ``location`` **or** both ``latitude`` and ``longitude`` (optional
    ``radius_meters``, default 5000 per Yelp). Yelp allows offset 0–950 with limit 50
    (up to 1000 total hits per query).
    """
    key = (settings.yelp_api_key or "").strip()
    if not key:
        return []

    lim = min(max(limit, 1), 50)
    off = min(max(offset, 0), 950)
    params: dict[str, Any] = {"limit": lim, "offset": off}
    use_coords = latitude is not None and longitude is not None
    if use_coords:
        params["latitude"] = latitude
        params["longitude"] = longitude
        r = 5000 if radius_meters is None else int(radius_meters)
        params["radius"] = min(max(r, 1), YELP_MAX_SEARCH_RADIUS_M)
    else:
        loc = (location or "United States").strip()
        params["location"] = loc
    if term and term.strip():
        params["term"] = term.strip()

    headers = {"Authorization": f"Bearer {key}"}
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(YELP_SEARCH_URL, params=params, headers=headers)
    except httpx.RequestError:
        return []

    if response.status_code != 200:
        return []

    try:
        data = response.json()
    except ValueError:
        return []

    businesses = data.get("businesses")
    if not isinstance(businesses, list):
        return []
    return [b for b in businesses if isinstance(b, dict)]


def fetch_business_details(yelp_business_id: str) -> dict[str, Any]:
    """GET /v3/businesses/{id}. Raises AppHTTPException on config / HTTP / parse errors."""
    key = (settings.yelp_api_key or "").strip()
    if not key:
        raise AppHTTPException(
            status_code=503,
            detail="Yelp API is not configured. Set YELP_API_KEY in your environment.",
        )

    url = YELP_BUSINESS_URL.format(business_id=yelp_business_id.strip())
    headers = {"Authorization": f"Bearer {key}"}

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(url, headers=headers)
    except httpx.RequestError as exc:
        raise AppHTTPException(
            status_code=503,
            detail=f"Could not reach Yelp ({type(exc).__name__}). Check your network.",
        ) from exc

    if response.status_code == 404:
        raise AppHTTPException(status_code=404, detail="That Yelp business id was not found.")
    if response.status_code == 401:
        raise AppHTTPException(status_code=503, detail="Yelp rejected the API key. Check YELP_API_KEY.")
    if response.status_code == 429:
        raise AppHTTPException(
            status_code=429,
            detail="Yelp rate limit hit. Wait a bit and try again.",
        )
    if response.status_code != 200:
        raise AppHTTPException(
            status_code=502,
            detail=f"Yelp returned an unexpected status ({response.status_code}).",
        )

    try:
        data = response.json()
    except ValueError:
        raise AppHTTPException(status_code=502, detail="Yelp returned invalid JSON.") from None

    if not isinstance(data, dict):
        raise AppHTTPException(status_code=502, detail="Yelp response was not a JSON object.")

    return data


def yelp_price_to_level(price: str | None) -> int | None:
    if not price or not isinstance(price, str):
        return None
    mapping = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    return mapping.get(price.strip())


def _parse_hours(raw_hours: Any) -> list[dict[str, Any]] | None:
    """Extract hours array from Yelp response. Each item: open_time, close_time, day, is_overnight."""
    if not isinstance(raw_hours, list):
        return None
    result: list[dict[str, Any]] = []
    for h in raw_hours:
        if not isinstance(h, dict):
            continue
        period = h.get("open") or []
        if not isinstance(period, list):
            continue
        for p in period:
            if isinstance(p, dict):
                entry = {
                    "day": p.get("day"),
                    "start": p.get("start"),
                    "end": p.get("end"),
                    "is_overnight": p.get("is_overnight", False),
                }
                result.append(entry)
    return result if result else None


def yelp_fusion_json_safe(obj: Any) -> Any:
    """
    Deep-copy Yelp API JSON into plain dict/list/scalars so SQLAlchemy/MySQL JSON
    columns never see non-serializable values (e.g. odd nested types).
    """
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, dict):
        return {str(k): yelp_fusion_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [yelp_fusion_json_safe(x) for x in obj]
    if isinstance(obj, tuple):
        return [yelp_fusion_json_safe(x) for x in obj]
    return str(obj)


def _extract_website_url(raw: dict[str, Any]) -> str | None:
    """
    Official business website when Fusion exposes it. The top-level ``url`` field
    is the Yelp listing page, not the merchant site—check ``attributes`` and
    legacy keys used by some responses.
    """

    def _take(val: Any) -> str | None:
        if not isinstance(val, str):
            return None
        s = val.strip()
        if not s.startswith(("http://", "https://")):
            return None
        return s[:512]

    for key in ("business_url", "website"):
        if (u := _take(raw.get(key))) is not None:
            return u

    attrs = raw.get("attributes")
    if isinstance(attrs, dict):
        for key in ("business_url", "url", "website"):
            if (u := _take(attrs.get(key))) is not None:
                return u

    return None


def normalize_yelp_business(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Map Fusion business **detail** JSON into ``Restaurant`` columns + ``photo_urls``.

    The full raw payload is stored separately as ``yelp_fusion_snapshot`` on import
    (see ``import_from_yelp``) so attributes like ``alias``, ``special_hours``, and
    the complete ``categories`` list are never dropped.
    """
    yelp_id = (raw.get("id") or "").strip()
    name = (raw.get("name") or "").strip() or "Imported listing"

    loc = raw.get("location") if isinstance(raw.get("location"), dict) else {}
    addr_parts = []
    for key in ("address1", "address2", "address3"):
        val = loc.get(key)
        if isinstance(val, str) and (v := val.strip()):
            addr_parts.append(v)
    address_line = ", ".join(addr_parts)[:255] if addr_parts else None
    city = (loc.get("city") or "").strip() or "Unknown"
    state = (loc.get("state") or "").strip() or None
    postal_code = (loc.get("zip_code") or "").strip() or None
    country = (loc.get("country") or "US").strip() or "US"

    coords = raw.get("coordinates") if isinstance(raw.get("coordinates"), dict) else {}
    lat = coords.get("latitude")
    lng = coords.get("longitude")
    try:
        latitude = float(lat) if lat is not None else None
    except (TypeError, ValueError):
        latitude = None
    try:
        longitude = float(lng) if lng is not None else None
    except (TypeError, ValueError):
        longitude = None

    phone = raw.get("display_phone") or raw.get("phone")
    if phone is not None:
        phone = str(phone).strip() or None

    yelp_url = raw.get("url")
    if yelp_url is not None:
        yelp_url = str(yelp_url).strip() or None
    website_url = _extract_website_url(raw)

    categories = raw.get("categories") or []
    cuisine_tags: list[str] = []
    if isinstance(categories, list):
        for c in categories:
            if isinstance(c, dict):
                title = (c.get("title") or "").strip()
                if title:
                    cuisine_tags.append(title)

    desc_parts = [t for t in cuisine_tags[:5]]
    description = " · ".join(desc_parts) if desc_parts else None

    try:
        rating = float(raw.get("rating") or 0.0)
    except (TypeError, ValueError):
        rating = 0.0
    try:
        review_count = int(raw.get("review_count") or 0)
    except (TypeError, ValueError):
        review_count = 0

    photos: list[str] = []
    raw_photos = raw.get("photos")
    if isinstance(raw_photos, list):
        for u in raw_photos:
            if isinstance(u, str) and u.strip():
                photos.append(u.strip())
    image_url = raw.get("image_url")
    if isinstance(image_url, str) and image_url.strip() and image_url not in photos:
        photos.insert(0, image_url.strip())
    # Persist every photo URL Fusion returns (no cap — mirrored in restaurant_photos rows)

    transactions: list[str] | None = None
    raw_tx = raw.get("transactions")
    if isinstance(raw_tx, list):
        transactions = [str(t).strip() for t in raw_tx if isinstance(t, str) and t.strip()]
        transactions = transactions or None

    hours = _parse_hours(raw.get("hours"))

    is_closed = raw.get("is_closed") is True

    return {
        "yelp_business_id": yelp_id,
        "name": name,
        "description": description,
        "address_line": address_line,
        "city": city,
        "state": state,
        "postal_code": postal_code,
        "country": country,
        "phone": phone,
        "website_url": website_url,
        "latitude": latitude,
        "longitude": longitude,
        "average_rating": max(0.0, min(5.0, rating)),
        "review_count": max(0, review_count),
        "price_level": yelp_price_to_level(raw.get("price") if isinstance(raw.get("price"), str) else None),
        "cuisine_tags": cuisine_tags or None,
        "dietary_tags": None,
        "ambiance_tags": None,
        "yelp_url": yelp_url,
        "hours": hours,
        "transactions": transactions,
        "photo_urls": photos,
        "is_closed": is_closed,
    }
