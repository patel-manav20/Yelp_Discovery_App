import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRestaurant, claimRestaurant } from "../services/restaurantService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import RatingStars from "../components/reviews/RatingStars";
import { getApiErrorMessage } from "../utils/apiError";
import { ROUTES } from "../constants/routes";

export default function ClaimRestaurantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const restaurantId = Number(id);
  const [restaurant, setRestaurant] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!restaurantId || Number.isNaN(restaurantId)) {
        setError("Invalid restaurant");
        setLoading(false);
        return;
      }
      try {
        const r = await getRestaurant(restaurantId);
        if (!cancelled) setRestaurant(r);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Restaurant not found"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [restaurantId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await claimRestaurant(restaurantId, message);
      setSuccess(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not submit claim"));
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

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Claim submitted</h1>
          <p className="text-sm text-gray-600 mt-2">
            We&apos;ll review your request for <strong>{restaurant.name}</strong>. You can check back on your owner dashboard later.
          </p>
          <Link
            to={`/restaurants/${restaurantId}`}
            className="inline-block mt-6 text-sm font-semibold text-yelp-red hover:underline"
          >
            Back to restaurant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4 pb-12">
      <Link to={`/restaurants/${restaurantId}`} className="text-sm text-yelp-red hover:underline">
        ← Back
      </Link>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Claim this business</h1>
        <p className="text-sm text-gray-600 mt-1">
          Tell us you&apos;re authorized to manage this listing on this directory.
        </p>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="font-semibold text-gray-900">{restaurant.name}</p>
          <p className="text-sm text-gray-600">
            {restaurant.city}
            {restaurant.state ? `, ${restaurant.state}` : ""}
          </p>
          <div className="mt-2">
            <RatingStars
              rating={restaurant.average_rating}
              size="sm"
              reviewCount={restaurant.review_count}
            />
          </div>
        </div>
      </div>

      {restaurant.owner_user_id != null ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-amber-50 p-5 text-sm text-amber-900">
          This listing already has an owner. Claims are only for unassigned businesses.
          <Link to={`/restaurants/${restaurantId}`} className="block mt-3 text-yelp-red font-medium hover:underline">
            Back to restaurant
          </Link>
        </div>
      ) : null}

      {restaurant.owner_user_id == null ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4"
        >
          {error ? <ErrorMessage message={error} onDismiss={() => setError("")} /> : null}
          <p className="text-sm text-gray-600">
            Owner accounts only. Use an account registered as a restaurant owner.
          </p>
          <div>
            <label htmlFor="claim-msg" className="block text-sm font-medium text-gray-700 mb-1">
              Message (optional)
            </label>
            <textarea
              id="claim-msg"
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
              placeholder="Business name as registered, your role, or other details…"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit claim request"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
