"""
Print row counts and optional samples from the app database.

Run from ``backend`` (so ``.env`` loads):

    python -m app.db.inspect_db
    python -m app.db.inspect_db --sample 20
    python -m app.db.inspect_db --json
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from sqlalchemy import func, select

from app.db.database import SessionLocal
from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.favorite import Favorite
from app.models.restaurant import Restaurant
from app.models.restaurant_claim import RestaurantClaim
from app.models.restaurant_photo import RestaurantPhoto
from app.models.review import Review
from app.models.review_photo import ReviewPhoto
from app.models.user import User
from app.models.user_history import UserHistory
from app.models.user_preference import UserPreference


def _count(db, model) -> int:
    return int(db.execute(select(func.count()).select_from(model)).scalar_one())


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect MySQL data (counts + optional samples).")
    parser.add_argument(
        "--sample",
        type=int,
        default=10,
        metavar="N",
        help="Show N sample restaurants (0 to skip)",
    )
    parser.add_argument("--json", action="store_true", help="Machine-readable output")
    args = parser.parse_args()

    rows: list[tuple[str, type]] = [
        ("users", User),
        ("user_preferences", UserPreference),
        ("user_history", UserHistory),
        ("restaurants", Restaurant),
        ("restaurant_photos", RestaurantPhoto),
        ("restaurant_claims", RestaurantClaim),
        ("reviews", Review),
        ("review_photos", ReviewPhoto),
        ("favorites", Favorite),
        ("chat_sessions", ChatSession),
        ("chat_messages", ChatMessage),
    ]

    db = SessionLocal()
    try:
        counts: dict[str, int] = {}
        count_errors: dict[str, str] = {}
        for key, model in rows:
            try:
                counts[key] = _count(db, model)
            except Exception as exc:  # pragma: no cover
                count_errors[key] = str(exc)

        yelp_n = int(
            db.execute(
                select(func.count()).select_from(Restaurant).where(Restaurant.yelp_business_id.isnot(None))
            ).scalar_one()
        )
        counts["restaurants_with_yelp_id"] = yelp_n

        sample_restaurants: list[dict[str, Any]] = []
        if args.sample > 0:
            stmt = (
                select(Restaurant)
                .order_by(Restaurant.id.desc())
                .limit(args.sample)
            )
            for r in db.execute(stmt).scalars():
                sample_restaurants.append(
                    {
                        "id": r.id,
                        "name": r.name,
                        "city": r.city,
                        "source_type": r.source_type.value if r.source_type else None,
                        "yelp_business_id": r.yelp_business_id,
                        "is_active": r.is_active,
                        "average_rating": r.average_rating,
                        "review_count": r.review_count,
                    }
                )
    except Exception as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}))
        else:
            print(f"Database error: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    if args.json:
        out: dict[str, Any] = {"counts": counts, "sample_restaurants": sample_restaurants}
        if count_errors:
            out["count_errors"] = count_errors
        print(json.dumps(out, indent=2))
        return 0

    print("Table row counts")
    print("-" * 40)
    for key, _model in rows:
        if key in count_errors:
            print(f"  {key:22} (error: {count_errors[key][:60]})")
        else:
            print(f"  {key:22} {counts[key]}")
    print(f"  {'restaurants_with_yelp_id':22} {yelp_n}")
    print()

    if args.sample > 0 and sample_restaurants:
        print(f"Latest {len(sample_restaurants)} restaurants (by id desc)")
        print("-" * 40)
        for row in sample_restaurants:
            y = row["yelp_business_id"] or "—"
            ys = str(y)
            y_disp = f"{ys[:20]}…" if len(ys) > 20 else ys
            nm = (row["name"] or "")[:48]
            print(
                f"  [{row['id']}] {nm} | {row['city']} | {row['source_type']} | yelp={y_disp}"
            )
    elif args.sample > 0:
        print("No restaurants in database.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
