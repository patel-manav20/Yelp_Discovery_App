import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RestaurantHero from "../components/restaurants/RestaurantHero";
import RestaurantInfo from "../components/restaurants/RestaurantInfo";
import PhotoGallery from "../components/restaurants/PhotoGallery";
import RatingStars from "../components/reviews/RatingStars";
import ReviewCard from "../components/reviews/ReviewCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import {
  getRestaurant,
  getYelpRestaurantDetail,
  importFromYelp,
} from "../services/restaurantService";
import { normalizeYelpDetailForPage } from "../utils/normalizeYelpBusinessDetail";
import { listReviewsForRestaurant } from "../services/reviewService";
import {
  addFavorite,
  listMyFavorites,
  removeFavorite,
} from "../services/favoriteService";
import { recordRestaurantView } from "../services/userService";
import { getApiErrorMessage } from "../utils/apiError";
import {
  ROUTES,
  restaurantPath,
  restaurantReviewPath,
  restaurantYelpPath,
  restaurantYelpReviewPath,
  restaurantEditPath,
  restaurantClaimPath,
} from "../constants/routes";

export default function RestaurantDetailsPage() {
  const { id: routeId, yelpId: yelpIdParam } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const reviewSectionRef = useRef(null);

  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const isYelpView = Boolean(yelpIdParam);
  const restaurantId = isYelpView ? NaN : Number(routeId);

  const loadRestaurant = useCallback(async () => {
    if (isYelpView) {
      setLoading(true);
      setError("");
      try {
        const raw = await getYelpRestaurantDetail(yelpIdParam, {
          persist: isAuthenticated,
        });
        const normalized = normalizeYelpDetailForPage(raw);
        if (!normalized?.name) {
          throw new Error("Not found");
        }
        setRestaurant(normalized);
      } catch (err) {
        setError(getApiErrorMessage(err, "Could not load this business from Yelp."));
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!restaurantId || Number.isNaN(restaurantId)) {
      setError("Invalid restaurant");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getRestaurant(restaurantId);
      setRestaurant(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Restaurant not found"));
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }, [isYelpView, yelpIdParam, restaurantId, isAuthenticated]);

  const loadReviews = useCallback(async () => {
    let targetId = null;
    if (isYelpView) {
      const lid = restaurant?.local_restaurant_id;
      targetId =
        lid != null && lid !== "" && !Number.isNaN(Number(lid)) ? Number(lid) : null;
    } else if (restaurantId && !Number.isNaN(restaurantId)) {
      targetId = restaurantId;
    }

    if (targetId == null) {
      setReviewsLoading(false);
      setReviews([]);
      setReviewTotal(0);
      return;
    }

    setReviewsLoading(true);
    try {
      const data = await listReviewsForRestaurant(targetId, { page: 1, limit: 50 });
      setReviews(data.items || []);
      setReviewTotal(data.total ?? 0);
    } catch {
      setReviews([]);
      setReviewTotal(0);
    } finally {
      setReviewsLoading(false);
    }
  }, [isYelpView, restaurantId, restaurant?.local_restaurant_id]);

  const loadFavoriteState = useCallback(async () => {
    if (!isAuthenticated) return;
    let targetId = null;
    if (isYelpView) {
      const lid = restaurant?.local_restaurant_id;
      targetId =
        lid != null && lid !== "" && !Number.isNaN(Number(lid)) ? Number(lid) : null;
    } else if (restaurantId && !Number.isNaN(restaurantId)) {
      targetId = restaurantId;
    }
    if (targetId == null) {
      setFavorited(false);
      return;
    }
    try {
      const { items } = await listMyFavorites();
      const ids = new Set((items || []).map((f) => f.restaurant_id));
      setFavorited(ids.has(targetId));
    } catch {
      setFavorited(false);
    }
  }, [isAuthenticated, isYelpView, restaurantId, restaurant?.local_restaurant_id]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    loadFavoriteState();
  }, [loadFavoriteState]);

  const viewTargetId = useMemo(() => {
    if (!isAuthenticated) return null;
    if (!isYelpView && restaurantId && !Number.isNaN(restaurantId)) return restaurantId;
    if (isYelpView) {
      const lid = restaurant?.local_restaurant_id;
      if (lid != null && lid !== "" && !Number.isNaN(Number(lid))) return Number(lid);
    }
    return null;
  }, [isAuthenticated, isYelpView, restaurantId, restaurant?.local_restaurant_id]);

  useEffect(() => {
    if (viewTargetId == null) return;
    recordRestaurantView(viewTargetId).catch(() => {});
  }, [viewTargetId]);

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, {
        state: {
          from: {
            pathname: isYelpView
              ? restaurantYelpPath(yelpIdParam)
              : restaurantPath(restaurantId),
          },
        },
      });
      return;
    }

    let targetId = null;
    if (isYelpView) {
      const lid = restaurant?.local_restaurant_id;
      if (lid != null && lid !== "" && !Number.isNaN(Number(lid))) {
        targetId = Number(lid);
      } else {
        try {
          const imported = await importFromYelp(yelpIdParam);
          targetId = imported.id;
          setRestaurant((prev) =>
            prev ? { ...prev, local_restaurant_id: imported.id } : prev
          );
        } catch (err) {
          setActionError(getApiErrorMessage(err, "Could not save this place"));
          return;
        }
      }
    } else {
      if (!restaurantId || Number.isNaN(restaurantId)) return;
      targetId = restaurantId;
    }

    try {
      if (favorited) {
        await removeFavorite(targetId);
        setFavorited(false);
      } else {
        await addFavorite(targetId);
        setFavorited(true);
      }
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not update favorite"));
    }
  };

  const btnPrimary =
    "inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-white text-sm font-bold bg-yelp-red hover:bg-yelp-red-hover shadow-sm border border-transparent transition-colors duration-200";
  const btnOutline =
    "inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-800 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 shadow-sm";

  if (loading) {
    return <LoadingSpinner fullPage label="Loading restaurant…" />;
  }

  if (error || !restaurant) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <ErrorMessage title="Unable to load" message={error || "Not found"} />
        <Link
          to={ROUTES.EXPLORE}
          className="mt-5 inline-flex text-yelp-red font-semibold hover:underline text-sm"
        >
          ← Back to search
        </Link>
      </div>
    );
  }

  const mainPhoto = restaurant.photos?.[0]?.photo_url;
  const sortedPhotos = [...(restaurant.photos || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const isOwnerOfListing =
    !isYelpView && user?.id != null && restaurant.owner_user_id === user.id;
  const canClaim =
    !isYelpView &&
    isAuthenticated &&
    user?.role === "owner" &&
    restaurant.owner_user_id == null;

  const writeReviewTargetPath = isYelpView
    ? restaurantYelpReviewPath(yelpIdParam)
    : restaurantReviewPath(restaurantId);

  const writeReviewTo = isAuthenticated ? writeReviewTargetPath : ROUTES.LOGIN;
  const writeReviewState = !isAuthenticated
    ? { from: { pathname: writeReviewTargetPath } }
    : undefined;

  const scrollToReviews = () => {
    reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pb-14 max-w-content mx-auto">
      <RestaurantHero
        name={restaurant.name}
        average_rating={restaurant.average_rating}
        review_count={restaurant.review_count}
        price_level={restaurant.price_level}
        cuisine_tags={restaurant.cuisine_tags || []}
        mainImageUrl={mainPhoto}
        isClaimed={restaurant.is_claimed}
        quickFacts={[
          restaurant.phone
            ? { label: "Phone", value: restaurant.phone }
            : null,
          restaurant.website_url
            ? {
                label: "Website",
                value: restaurant.website_url.replace(/^https?:\/\//, ""),
              }
            : null,
        ].filter(Boolean)}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3 p-4 sm:p-5 rounded-xl border border-gray-200 bg-white shadow-card">
        <Link to={writeReviewTo} state={writeReviewState} className={btnPrimary}>
          Write a review
        </Link>
        <button type="button" onClick={handleFavorite} className={btnOutline}>
          {favorited ? "Saved" : "Save"}
        </button>
        <button type="button" onClick={scrollToReviews} className={`${btnOutline} text-gray-700`}>
          See reviews
        </button>
        {isOwnerOfListing ? (
          <Link
            to={restaurantEditPath(restaurantId)}
            className={`${btnOutline} border-yelp-red/40 text-yelp-red hover:bg-red-50`}
          >
            Edit listing
          </Link>
        ) : null}
        {canClaim ? (
          <Link
            to={restaurantClaimPath(restaurantId)}
            className={`${btnOutline} border-yelp-red/40 text-yelp-red hover:bg-red-50`}
          >
            Claim this business
          </Link>
        ) : null}
      </div>

      {actionError ? (
        <ErrorMessage
          message={actionError}
          onDismiss={() => setActionError("")}
          className="mt-4"
        />
      ) : null}

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        <div className="lg:col-span-8 space-y-10">
          <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Overview</h2>
            <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-gray-100">
              <RatingStars
                rating={restaurant.average_rating}
                size="lg"
                showNumber
                reviewCount={restaurant.review_count}
              />
            </div>
            {(restaurant.cuisine_tags?.length ?? 0) > 0 ? (
              <>
                <p className="mt-4 text-sm font-bold text-gray-900">
                  {(restaurant.cuisine_tags || []).join(" · ")}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {(restaurant.cuisine_tags || []).join(" · ")}
                </p>
              </>
            ) : null}
            {restaurant.description ? (
              <p className="mt-5 text-base text-gray-700 leading-relaxed">
                {restaurant.description}
              </p>
            ) : !isYelpView ? (
              <p className="mt-5 text-sm text-gray-500 italic">
                No description has been added for this business yet.
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Photos</h2>
            <PhotoGallery photos={sortedPhotos} />
          </section>

          <section
            ref={reviewSectionRef}
            id="reviews"
            className="rounded-xl border border-gray-200 bg-white shadow-card scroll-mt-28 overflow-hidden"
          >
            <div className="px-6 sm:px-8 pt-7 sm:pt-8 pb-4 border-b border-gray-100 bg-surface-subtle/50">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Reviews</h2>
              <p className="mt-1 text-sm font-medium text-gray-600">
                {reviewTotal} {reviewTotal === 1 ? "review" : "reviews"} from the community
              </p>
            </div>

            <div className="px-6 sm:px-8 pt-2 pb-6 sm:pb-8">
              {!isAuthenticated ? (
                <p className="pt-4 text-sm text-gray-800 leading-relaxed">
                  <Link
                    to={ROUTES.LOGIN}
                    state={{ from: { pathname: writeReviewTargetPath } }}
                    className="font-bold text-yelp-red hover:underline"
                  >
                    Log in
                  </Link>{" "}
                  to write a review.
                </p>
              ) : (
                <p className="pt-4">
                  <Link
                    to={writeReviewTargetPath}
                    className="text-sm font-bold text-yelp-red hover:underline"
                  >
                    Write your review →
                  </Link>
                </p>
              )}

              <div className="mt-5 border-t border-gray-100 pt-5">
                {reviewsLoading ? (
                  <LoadingSpinner label="Loading reviews…" />
                ) : reviews.length === 0 ? (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    No reviews yet. Be the first to share your experience.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {reviews.map((r) => (
                      <ReviewCard key={r.id} review={r} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <RestaurantInfo
            address_line={restaurant.address_line}
            city={restaurant.city}
            state={restaurant.state}
            postal_code={restaurant.postal_code}
            country={restaurant.country}
            latitude={restaurant.latitude}
            longitude={restaurant.longitude}
            phone={restaurant.phone}
            website_url={restaurant.website_url}
            hours={restaurant.hours}
            transactions={restaurant.transactions}
          />
          {!restaurant.hours?.length ? (
            <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
              <h2 className="text-base font-bold text-gray-900 mb-3 pb-3 border-b border-gray-100">
                Hours
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Hours aren&apos;t listed for this business yet. Call ahead to confirm.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
