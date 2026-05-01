import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory } from "../services/userService";
import { getOwnerDashboard } from "../services/ownerService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";
import { getApiErrorMessage } from "../utils/apiError";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";
import ReviewCard from "../components/reviews/ReviewCard";

function formatAction(action) {
  if (!action) return "Activity";
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export default function HistoryPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (isOwner) {
          const dash = await getOwnerDashboard();
          if (!cancelled) {
            setItems(dash?.recent_reviews || []);
            setTotal(dash?.total_restaurant_views ?? 0);
          }
        } else {
          const data = await getHistory({ limit: 100, offset: 0 });
          if (!cancelled) {
            const filtered = (data.items || []).filter((it) => !String(it?.action || "").startsWith("review_"));
            setItems(filtered);
            setTotal(filtered.length);
          }
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load history"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isOwner]);

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">
        {isOwner ? "Activity" : "Recent activity"}
      </h1>
      {isOwner ? null : (
        <p className="text-sm text-gray-600 mt-1">
          {`${total} ${total === 1 ? "event" : "events"} on your account`}
        </p>
      )}

      {error ? (
        <ErrorMessage message={error} onDismiss={() => setError("")} className="mt-4" />
      ) : null}

      {loading ? (
        <LoadingSpinner fullPage label="Loading activity…" />
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No activity yet"
            description={
              isOwner
                ? "As diners visit your listings, views and reviews will show up here."
                : "When you browse restaurants or update your profile, it will show up here."
            }
            action={
              <Link
                to={ROUTES.EXPLORE}
                className="px-5 py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover"
              >
                Explore
              </Link>
            }
          />
        </div>
      ) : (
        isOwner ? (
          <ul className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            {items.map((rev) => (
              <li
                key={rev.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/restaurants/${rev.restaurant_id}`}
                    className="text-xs font-bold text-yelp-red hover:underline mb-2 inline-block"
                  >
                    View listing →
                  </Link>
                  <ReviewCard review={rev} className="py-0 border-0" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            {items.map((entry) => (
              <li
                key={entry.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
              >
                <div>
                  <p className="font-semibold text-gray-900">{formatAction(entry.action)}</p>
                  <time className="text-xs text-gray-500">{formatTime(entry.viewed_at)}</time>
                  {entry.restaurant ? (
                    <Link
                      to={`/restaurants/${entry.restaurant.id}`}
                      className="mt-2 inline-block text-sm text-yelp-red font-medium hover:underline"
                    >
                      {entry.restaurant.name} · {entry.restaurant.city}
                    </Link>
                  ) : entry.restaurant_id ? (
                    <Link
                      to={`/restaurants/${entry.restaurant_id}`}
                      className="mt-2 inline-block text-sm text-yelp-red hover:underline"
                    >
                      Restaurant #{entry.restaurant_id}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
