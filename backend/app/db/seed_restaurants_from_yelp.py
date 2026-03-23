"""
Seed MySQL with Yelp Fusion listings (search + business detail per id).

Equivalent intent to a standalone ``seed_restaurants.py`` that called Yelp and
inserted rows: this uses ``restaurant_service.bulk_import_yelp_search`` so
schema matches ``Restaurant`` / ``RestaurantPhoto`` (yelp_business_id, JSON hours,
yelp_fusion_snapshot, etc.).

Run from ``backend`` with ``YELP_API_KEY`` and ``DATABASE_URL`` in ``.env``:

    python -m app.db.seed_restaurants_from_yelp
    python -m app.db.seed_restaurants_from_yelp --per-city 50 --term restaurants
    python -m app.db.seed_restaurants_from_yelp --cities "San Jose, CA|Palo Alto, CA"
"""

from __future__ import annotations

import argparse
import sys

from app.core.exceptions import AppHTTPException
from app.db.database import SessionLocal
from app.services import restaurant_service

DEFAULT_CITIES = [
    "San Jose, CA",
    "Santa Clara, CA",
    "Sunnyvale, CA",
    "Fremont, CA",
]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import Yelp businesses into the local DB (one batch per city).",
    )
    parser.add_argument(
        "--cities",
        type=str,
        default="|".join(DEFAULT_CITIES),
        help='Pipe-separated locations, e.g. "San Jose, CA|Fremont, CA" (default: four Bay Area cities).',
    )
    parser.add_argument(
        "--per-city",
        type=int,
        default=40,
        metavar="N",
        help="Max distinct businesses to collect per city (default: 40).",
    )
    parser.add_argument(
        "--term",
        type=str,
        default="restaurants",
        help='Yelp search term (default: "restaurants").',
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.2,
        help="Seconds between Yelp business-detail calls (default: 0.2).",
    )
    parser.add_argument(
        "--search-delay",
        type=float,
        default=0.0,
        help="Seconds between Yelp search pages (default: 0).",
    )
    args = parser.parse_args()

    cities = [c.strip() for c in args.cities.split("|") if c.strip()]
    if not cities:
        print("No cities given.", file=sys.stderr)
        return 1

    per = max(1, min(args.per_city, 1000))

    total_new = 0
    total_updated = 0
    all_failed: list[dict[str, str]] = []

    db = SessionLocal()
    try:
        for city in cities:
            print(f"\n--- {city} (up to {per} businesses) ---")
            try:
                out = restaurant_service.bulk_import_yelp_search(
                    db,
                    terms=[args.term],
                    location=city,
                    max_total=per,
                    delay_seconds=args.delay,
                    search_delay_seconds=args.search_delay,
                )
            except AppHTTPException as exc:
                print(f"Error: {exc.detail}", file=sys.stderr)
                return 1

            total_new += int(out.get("imported_new") or 0)
            total_updated += int(out.get("updated_existing") or 0)
            failed = out.get("failed") or []
            if isinstance(failed, list):
                all_failed.extend(failed)
            print(
                f"  new: {out.get('imported_new')}, "
                f"updated: {out.get('updated_existing')}, "
                f"failed this city: {len(failed) if isinstance(failed, list) else 0}",
            )
    finally:
        db.close()

    print("\n--- Summary ---")
    print(f"Cities processed: {len(cities)}")
    print(f"Imported (new rows): {total_new}")
    print(f"Updated (existing yelp_business_id): {total_updated}")
    if all_failed:
        print(f"Failed detail calls: {len(all_failed)}")
        for item in all_failed[:10]:
            print(f"  - {item}")
        if len(all_failed) > 10:
            print(f"  ... and {len(all_failed) - 10} more")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
