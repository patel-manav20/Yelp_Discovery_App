import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";
import LoadingSpinner from "./LoadingSpinner";

export default function OwnerRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage label="Loading…" />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.OWNER_LOGIN} state={{ from: location }} replace />
    );
  }

  if (user?.role !== "owner") {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">Owners only</h1>
        <p className="mt-2 text-sm text-gray-600">
          This area is for restaurant owners. Sign up as an owner or switch accounts.
        </p>
        <Link
          to={ROUTES.OWNER_SIGNUP}
          className="inline-block mt-6 px-5 py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover"
        >
          Owner sign up
        </Link>
        <p className="mt-4">
          <Link to={ROUTES.HOME} className="text-sm text-yelp-red hover:underline">
            Back home
          </Link>
        </p>
      </div>
    );
  }

  return children;
}
