import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOwnerDashboard,
  listOwnedRestaurants,
  listOwnerReviews,
} from "../services/ownerService";
import ReviewCard from "../components/reviews/ReviewCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";
import { getApiErrorMessage } from "../utils/apiError";
import { getRestaurantImageFallback } from "../utils/restaurantImage";
import {
  ROUTES,
  restaurantPath,
  restaurantEditPath,
} from "../constants/routes";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "listings", label: "My listings" },
  { id: "reviews", label: "Reviews" },
  { id: "claim", label: "Claim" },
];

const REVIEW_LIMIT = 15;

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm px-5 py-4 text-white">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">{label}</p>
      <p className="text-3xl sm:text-4xl font-black mt-1 tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-white/65 mt-1">{hint}</p> : null}
    </div>
  );
}

function RatingDistributionRow({ stars, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-8 font-bold text-gray-700 tabular-nums">{stars}★</span>
      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-yelp-red to-red-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-gray-600 tabular-nums">{count}</span>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const [tab, setTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [owned, setOwned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewRestaurantId, setReviewRestaurantId] = useState("");
  const [reviewMinRating, setReviewMinRating] = useState("");
  const [reviewSort, setReviewSort] = useState("newest");
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsState, setReviewsState] = useState({ items: [], total: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dash, list] = await Promise.all([
        getOwnerDashboard(),
        listOwnedRestaurants(),
      ]);
      setDashboard(dash);
      setOwned(list.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReviewsTab = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError("");
    try {
      const data = await listOwnerReviews({
        restaurant_id: reviewRestaurantId ? Number(reviewRestaurantId) : undefined,
        min_rating: reviewMinRating ? Number(reviewMinRating) : undefined,
        sort_by: reviewSort,
        page: reviewPage,
        limit: REVIEW_LIMIT,
      });
      setReviewsState({ items: data.items || [], total: data.total ?? 0 });
    } catch (err) {
      setReviewsError(getApiErrorMessage(err, "Could not load reviews"));
      setReviewsState({ items: [], total: 0 });
    } finally {
      setReviewsLoading(false);
    }
  }, [reviewRestaurantId, reviewMinRating, reviewSort, reviewPage]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") loadCore();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadCore]);

  useEffect(() => {
    if (tab === "reviews") loadReviewsTab();
  }, [tab, loadReviewsTab]);

  const analytics = dashboard?.analytics?.reviews_by_rating || {};
  const sentiment = dashboard?.analytics?.sentiment || {};
  const totalViews = dashboard?.analytics?.total_restaurant_views ?? 0;
  const maxRatingCount = useMemo(
    () => Math.max(0, ...[1, 2, 3, 4, 5].map((s) => analytics[s] ?? 0)),
    [analytics]
  );

  const reviewTotalPages = Math.max(1, Math.ceil((reviewsState.total || 0) / REVIEW_LIMIT));

  if (loading) {
    return <LoadingSpinner fullPage label="Loading owner dashboard…" />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-white pb-16">
      <div className="relative overflow-hidden bg-gradient-to-br from-yelp-red via-red-600 to-rose-900 text-white">
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Business center</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-2 tracking-tight">Owner dashboard</h1>
          <p className="text-sm sm:text-base text-white/85 mt-2 max-w-2xl leading-relaxed">
            Manage listings, track diner feedback, and watch performance metrics.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to={ROUTES.RESTAURANTS_NEW}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white text-yelp-red text-sm font-bold shadow-lg hover:bg-red-50 transition-colors"
            >
              Add restaurant
            </Link>
            <Link
              to={ROUTES.EXPLORE}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border-2 border-white/80 text-white text-sm font-bold hover:bg-white/10 transition-colors"
            >
              Browse &amp; claim listings
            </Link>
          </div>
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link
                to={ROUTES.EXPLORE}
                className="inline-flex items-center px-3.5 py-2 rounded-lg bg-black/20 text-white text-sm font-semibold border border-white/25 hover:bg-black/30 transition-colors"
              >
                Explore
              </Link>
              <Link
                to={ROUTES.HISTORY}
                className="inline-flex items-center px-3.5 py-2 rounded-lg bg-black/20 text-white text-sm font-semibold border border-white/25 hover:bg-black/30 transition-colors"
              >
                Activity
              </Link>
              <Link
                to={ROUTES.PREFERENCES}
                className="inline-flex items-center px-3.5 py-2 rounded-lg bg-black/20 text-white text-sm font-semibold border border-white/25 hover:bg-black/30 transition-colors"
              >
                Preferences
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-10">
            <StatTile label="Listings" value={dashboard?.total_restaurants ?? 0} />
            <StatTile label="Reviews" value={dashboard?.total_reviews ?? 0} hint="All diners" />
            <StatTile
              label="Avg rating"
              value={
                dashboard?.total_reviews
                  ? Number(dashboard.average_rating).toFixed(1)
                  : "—"
              }
            />
            <StatTile
              label="Page views"
              value={totalViews}
              hint="visits to your pages"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="flex overflow-x-auto gap-1 p-2 bg-gray-50/90 border-b border-gray-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  if (t.id === "reviews") setReviewPage(1);
                }}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === t.id
                    ? "bg-white text-yelp-red shadow-sm border border-gray-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-8">
            {error ? (
              <ErrorMessage message={error} onDismiss={() => setError("")} className="mb-6" />
            ) : null}

            {tab === "overview" ? (
              <div className="space-y-10">
                <section>
                  <h2 className="text-lg font-bold text-gray-900">Public sentiment</h2>
                  <div className="grid sm:grid-cols-3 gap-4 mt-5">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
                      <p className="text-xs font-bold uppercase text-emerald-800 tracking-wide">Positive</p>
                      <p className="text-3xl font-black text-emerald-900 mt-2">
                        {sentiment.positive_percent ?? 0}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5">
                      <p className="text-xs font-bold uppercase text-amber-900 tracking-wide">Neutral</p>
                      <p className="text-3xl font-black text-amber-950 mt-2">
                        {sentiment.neutral_percent ?? 0}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-5">
                      <p className="text-xs font-bold uppercase text-rose-900 tracking-wide">Negative</p>
                      <p className="text-3xl font-black text-rose-950 mt-2">
                        {sentiment.negative_percent ?? 0}%
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-900">Rating distribution</h2>
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-3">
                    {[5, 4, 3, 2, 1].map((s) => (
                      <RatingDistributionRow
                        key={s}
                        stars={s}
                        count={analytics[s] ?? 0}
                        max={maxRatingCount}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">Recent reviews</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setTab("reviews");
                        setReviewPage(1);
                      }}
                      className="text-sm font-bold text-yelp-red hover:underline"
                    >
                      Open reviews hub →
                    </button>
                  </div>
                  <div className="mt-4 rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden bg-white">
                    {!dashboard?.recent_reviews?.length ? (
                      <p className="p-8 text-center text-sm text-gray-500">
                        No reviews yet. When diners post on your public pages, they show up here.
                      </p>
                    ) : (
                      dashboard.recent_reviews.map((rev) => (
                        <div key={rev.id} className="p-4 sm:p-5 hover:bg-gray-50/80 transition-colors">
                          <Link
                            to={restaurantPath(rev.restaurant_id)}
                            className="text-xs font-bold text-yelp-red hover:underline mb-2 inline-block"
                          >
                            View listing →
                          </Link>
                          <ReviewCard review={rev} className="py-0 border-0" />
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {tab === "listings" ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Restaurant profile management</h2>
                    <p className="text-sm text-gray-600 mt-1 max-w-xl">
                      Update details, hours, contact, pricing, and tags on each listing. Use{" "}
                      <strong className="text-gray-800">Add restaurant</strong> for new listings with photo URLs.
                      Changes apply to the live diner-facing page immediately.
                    </p>
                  </div>
                  <Link
                    to={ROUTES.RESTAURANTS_NEW}
                    className="shrink-0 inline-flex justify-center px-4 py-2.5 rounded-xl bg-yelp-red text-white text-sm font-bold hover:bg-yelp-red-hover shadow-sm"
                  >
                    New listing
                  </Link>
                </div>
                {owned.length === 0 ? (
                  <EmptyState
                    title="No restaurants yet"
                    description="Create a listing or claim one from Explore to manage it here."
                    action={
                      <div className="flex flex-wrap gap-3 justify-center">
                        <Link
                          to={ROUTES.RESTAURANTS_NEW}
                          className="px-5 py-2.5 rounded-xl text-white text-sm font-bold bg-yelp-red hover:bg-yelp-red-hover"
                        >
                          Add restaurant
                        </Link>
                        <Link
                          to={ROUTES.EXPLORE}
                          className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-800 hover:bg-gray-50"
                        >
                          Explore listings
                        </Link>
                      </div>
                    }
                  />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-5">
                    {owned.map((r) => {
                      const img =
                        r.primary_photo_url ||
                        getRestaurantImageFallback(r.name, r.cuisine_tags);
                      return (
                        <article
                          key={r.id}
                          className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-yelp-red/25 transition-all overflow-hidden flex flex-col"
                        >
                          <div className="relative h-40 bg-gray-100">
                            <img
                              src={img}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3">
                              <h3 className="text-lg font-bold text-white drop-shadow-sm line-clamp-2">
                                {r.name}
                              </h3>
                              <p className="text-xs text-white/90 mt-0.5">
                                {[r.city, r.state].filter(Boolean).join(", ")} · {r.review_count ?? 0}{" "}
                                reviews
                              </p>
                            </div>
                          </div>
                          <div className="p-4 flex flex-col gap-3 flex-1">
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {r.description || "Add a description in the editor to tell your story."}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-auto">
                              <Link
                                to={restaurantPath(r.id)}
                                className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 hover:border-yelp-red/40 hover:bg-red-50/50"
                              >
                                View live page
                              </Link>
                              <Link
                                to={restaurantEditPath(r.id)}
                                className="inline-flex items-center px-3 py-2 rounded-lg bg-yelp-red text-white text-xs font-bold hover:bg-yelp-red-hover shadow-sm"
                              >
                                Edit listing
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {tab === "reviews" ? (
              <div>
                <h2 className="text-lg font-bold text-gray-900">Reviews dashboard</h2>
                <p className="text-sm text-gray-600 mt-1 mb-6">
                  Read-only feed across all owned restaurants. Filter and sort to monitor feedback.
                </p>

                <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 mb-6">
                  <select
                    value={reviewRestaurantId}
                    onChange={(e) => {
                      setReviewRestaurantId(e.target.value);
                      setReviewPage(1);
                    }}
                    className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium bg-white min-w-[200px]"
                  >
                    <option value="">All listings</option>
                    {owned.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={reviewMinRating}
                    onChange={(e) => {
                      setReviewMinRating(e.target.value);
                      setReviewPage(1);
                    }}
                    className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium bg-white min-w-[160px]"
                  >
                    <option value="">Any star level</option>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}+ stars
                      </option>
                    ))}
                  </select>
                  <select
                    value={reviewSort}
                    onChange={(e) => {
                      setReviewSort(e.target.value);
                      setReviewPage(1);
                    }}
                    className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium bg-white min-w-[180px]"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="rating_high">Highest rating</option>
                    <option value="rating_low">Lowest rating</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => loadReviewsTab()}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-800 hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                </div>

                {reviewsError ? (
                  <ErrorMessage message={reviewsError} onDismiss={() => setReviewsError("")} className="mb-4" />
                ) : null}

                {reviewsLoading ? (
                  <LoadingSpinner label="Loading reviews…" />
                ) : reviewsState.items.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12 border border-dashed border-gray-200 rounded-2xl">
                    No reviews match these filters.
                  </p>
                ) : (
                  <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden bg-white">
                    {reviewsState.items.map((rev) => (
                      <div key={rev.id} className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-bold text-gray-800">
                            {rev.restaurant_name}
                          </span>
                          <Link
                            to={restaurantPath(rev.restaurant_id)}
                            className="text-xs font-bold text-yelp-red hover:underline"
                          >
                            Public page →
                          </Link>
                        </div>
                        <ReviewCard review={rev} className="py-0 border-0" />
                      </div>
                    ))}
                  </div>
                )}

                {reviewsState.total > REVIEW_LIMIT ? (
                  <div className="flex justify-center items-center gap-3 mt-6">
                    <button
                      type="button"
                      disabled={reviewPage <= 1}
                      onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-bold disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {reviewPage} of {reviewTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={reviewPage >= reviewTotalPages}
                      onClick={() => setReviewPage((p) => p + 1)}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-bold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "claim" ? (
              <div className="max-w-2xl">
                <h2 className="text-lg font-bold text-gray-900">Claim a restaurant</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Found your business already on the directory? Open its public page while signed in as an
                  owner and use <strong className="text-gray-800">Claim this business</strong>. Our team can
                  match you to the listing so you can manage profile, hours, and photos.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-gray-700 list-disc pl-5">
                  <li>Use the same account you used for owner sign-up.</li>
                  <li>Claim ties the listing to you for editing and analytics.</li>
                  <li>After claiming, return here under <strong>My listings</strong> to finish your profile.</li>
                </ul>
                <Link
                  to={ROUTES.EXPLORE}
                  className="inline-flex mt-8 px-6 py-3 rounded-xl bg-yelp-red text-white text-sm font-bold hover:bg-yelp-red-hover shadow-md"
                >
                  Go to Explore
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Tip: leave this tab open or click Refresh after diners submit reviews — data loads live from your
          API.
        </p>
      </div>
    </div>
  );
}
