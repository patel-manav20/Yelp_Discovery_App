import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  addFavorite,
  listMyFavorites,
  removeFavorite,
} from "../services/favoriteService";
import RestaurantGrid from "../components/restaurants/RestaurantGrid";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import ErrorMessage from "../components/common/ErrorMessage";
import { getApiErrorMessage } from "../utils/apiError";
import { ROUTES } from "../constants/routes";

export default function FavoritesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listMyFavorites();
      setItems(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load favorites"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const restaurants = items.map((f) => f.restaurant).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">Saved places</h1>
      <p className="text-sm text-gray-600 mt-1">
        Restaurants you&apos;ve bookmarked
      </p>

      {error ? (
        <ErrorMessage message={error} onDismiss={() => setError("")} className="mt-4" />
      ) : null}

      {loading ? (
        <LoadingSpinner fullPage label="Loading favorites…" />
      ) : restaurants.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No saved restaurants yet"
            description="Tap the heart on a listing to save it here."
            action={
              <Link
                to={ROUTES.EXPLORE}
                className="px-5 py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover"
              >
                Explore restaurants
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8">
          <RestaurantGrid
            restaurants={restaurants}
            getCardProps={() => ({
              isFavorited: true,
              onFavoriteToggle: async (restaurantId, next) => {
                try {
                  if (next) await addFavorite(restaurantId);
                  else await removeFavorite(restaurantId);
                  await load();
                } catch (e) {
                  setError(getApiErrorMessage(e, "Could not update favorite"));
                }
              },
            })}
          />
          <p className="text-xs text-gray-400 mt-4">
            To remove a favorite, open the restaurant and tap Save again.
          </p>
        </div>
      )}
    </div>
  );
}
