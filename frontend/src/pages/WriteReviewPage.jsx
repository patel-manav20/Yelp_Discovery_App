import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getRestaurant, importFromYelp } from "../services/restaurantService";
import { createReview } from "../services/reviewService";
import ReviewForm from "../components/reviews/ReviewForm";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import RatingStars from "../components/reviews/RatingStars";
import { getApiErrorMessage } from "../utils/apiError";
import { ROUTES, restaurantYelpPath } from "../constants/routes";

export default function WriteReviewPage() {
  const { id, yelpId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isYelpFlow = Boolean(yelpId);

  const starsRaw = searchParams.get("stars");
  const starsNum = starsRaw != null ? Number(starsRaw) : NaN;
  const initialRating =
    Number.isFinite(starsNum) && starsNum >= 1 && starsNum <= 5 ? starsNum : 0;

  const numericId = id != null ? Number(id) : NaN;

  const [restaurant, setRestaurant] = useState(null);
  const [effectiveRestaurantId, setEffectiveRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (isYelpFlow) {
          const r = await importFromYelp(yelpId);
          if (!cancelled) {
            setRestaurant(r);
            setEffectiveRestaurantId(r.id);
          }
        } else {
          if (!numericId || Number.isNaN(numericId)) {
            if (!cancelled) setError("Invalid restaurant");
            return;
          }
          const r = await getRestaurant(numericId);
          if (!cancelled) {
            setRestaurant(r);
            setEffectiveRestaurantId(numericId);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Restaurant not found"));
          setRestaurant(null);
          setEffectiveRestaurantId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isYelpFlow, yelpId, numericId]);

  const handleSubmit = async (payload) => {
    if (effectiveRestaurantId == null) return;
    setError("");
    setSubmitting(true);
    try {
      await createReview({
        restaurant_id: effectiveRestaurantId,
        rating: payload.rating,
        body: payload.body,
        photo_urls: payload.photo_urls || [],
      });
      if (isYelpFlow) {
        navigate(restaurantYelpPath(yelpId), { replace: true });
      } else {
        navigate(`/restaurants/${numericId}`, { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not post review"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading…" />;
  }

  if (error && !restaurant) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <ErrorMessage message={error} />
        <Link to={ROUTES.EXPLORE} className="mt-4 inline-block text-yelp-red hover:underline">
          ← Explore
        </Link>
      </div>
    );
  }

  const backTo = isYelpFlow ? restaurantYelpPath(yelpId) : `/restaurants/${numericId}`;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-12">
      <Link to={backTo} className="text-sm text-yelp-red hover:underline">
        ← Back to {restaurant?.name || "restaurant"}
      </Link>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Write a review</h1>
        <p className="text-lg font-semibold text-gray-800 mt-2">{restaurant.name}</p>
        <div className="mt-1">
          <RatingStars
            rating={restaurant.average_rating}
            size="sm"
            reviewCount={restaurant.review_count}
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {restaurant.city}
          {restaurant.state ? `, ${restaurant.state}` : ""}
        </p>
      </div>

      {error ? (
        <ErrorMessage message={error} onDismiss={() => setError("")} className="mt-4" />
      ) : null}

      <div className="mt-6">
        <ReviewForm
          initialRating={initialRating}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
