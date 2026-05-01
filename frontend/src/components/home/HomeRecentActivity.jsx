import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchRestaurants } from "../../services/restaurantService";
import { restaurantPath } from "../../constants/routes";
import RatingStars from "../reviews/RatingStars";
import LoadingSpinner from "../common/LoadingSpinner";
import { getRestaurantImageFallback } from "../../utils/restaurantImage";

const DUMMY_PROFILES = [
  "Ava Martinez",
  "Ethan Nguyen",
  "Sophia Patel",
  "Mia Johnson",
  "Noah Thompson",
  "Olivia Garcia",
  "Liam Chen",
  "Isabella Kim",
  "Lucas Brown",
  "Charlotte Davis",
  "Amir Khan",
  "Grace Lee",
];

const REVIEW_SNIPPETS = [
  "Great food, friendly staff, and everything came out quickly. I’ll definitely be back.",
  "Loved the flavors here. Portions were generous and the place was super clean.",
  "Perfect lunch stop — fresh ingredients and solid value for the area.",
  "Really good coffee and pastries. Cozy space for a quick break.",
  "Fantastic service and the menu has a lot of variety. Easy recommendation.",
  "One of my favorite spots lately. Consistent quality every visit.",
  "Tried this for the first time and it exceeded expectations.",
  "Great for a casual dinner. Nice vibe and well-seasoned dishes.",
  "Fast service, fair prices, and the food was genuinely delicious.",
  "Excellent ambiance and a strong menu from starters to dessert.",
  "Very fresh ingredients and great presentation.",
  "Solid neighborhood favorite with reliable quality.",
];

function priceDots(level) {
  if (!level || level < 1) return "";
  return "$".repeat(Math.min(4, level));
}

export default function HomeRecentActivity() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await searchRestaurants({
          sort_by: "newest",
          page: 1,
          limit: 9,
        });
        if (!cancelled) setItems(data.items || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-10">Recent activity</h2>
          <LoadingSpinner label="Loading…" />
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="py-14 sm:py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900 mb-10 sm:mb-12 tracking-tight">
          Recent activity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {items.map((r, i) => {
            const profileName = DUMMY_PROFILES[i % DUMMY_PROFILES.length];
            const profileLetter = (profileName?.trim()?.charAt(0) || "U").toUpperCase();
            const img =
              r.primary_photo_url ||
              getRestaurantImageFallback(r.name, r.cuisine_tags);
            const loc = [r.city, r.state].filter(Boolean).join(", ");
            const cats = (r.cuisine_tags || []).slice(0, 3).join(", ");
            return (
              <article
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white shadow-card hover:shadow-card-hover transition-shadow overflow-hidden"
              >
                <div className="flex gap-3 p-4 border-b border-gray-100 bg-surface-subtle/40">
                  <div className="h-10 w-10 rounded-full bg-yelp-red/10 text-yelp-red flex items-center justify-center text-sm font-bold shrink-0">
                    {profileLetter}
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="text-gray-900 font-semibold">{profileName}</p>
                    <p className="text-gray-500 text-xs mt-0.5">wrote a review · Nationwide listings</p>
                  </div>
                </div>
                <Link to={restaurantPath(r.id)} className="block group">
                  <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 group-hover:text-yelp-red transition-colors">
                      {r.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <RatingStars rating={r.average_rating} size="sm" showNumber />
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-600">{r.review_count} reviews</span>
                      {priceDots(r.price_level) ? (
                        <>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-700 font-medium">{priceDots(r.price_level)}</span>
                        </>
                      ) : null}
                    </div>
                    {cats ? <p className="mt-2 text-sm text-gray-600 line-clamp-2">{cats}</p> : null}
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed line-clamp-2">
                      &quot;{REVIEW_SNIPPETS[i % REVIEW_SNIPPETS.length]}&quot;
                    </p>
                    {loc ? <p className="mt-1 text-xs text-gray-500">{loc}</p> : null}
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
