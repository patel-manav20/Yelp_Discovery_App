import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { login } from "../services/authService";
import { ROUTES } from "../constants/routes";
import { buildReturnPath } from "../utils/navigation";
import ErrorMessage from "../components/common/ErrorMessage";

export default function OwnerLoginPage() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    buildReturnPath(location.state?.from) || ROUTES.OWNER_DASHBOARD;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    setSubmitting(true);
    try {
      const { access_token, user } = await login(email.trim(), password);
      setAuth(access_token, user);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Owner login</h1>
      <p className="mt-1 text-sm text-gray-600">
        Sign in to manage your restaurant listings
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error ? (
          <ErrorMessage
            message={error}
            onDismiss={() => setError("")}
            className="mb-4"
          />
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
              placeholder="owner@restaurant.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-50"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an owner account?{" "}
          <Link to={ROUTES.OWNER_SIGNUP} className="font-medium text-yelp-red hover:underline">
            Sign up as owner
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          Looking for diner login?{" "}
          <Link to={ROUTES.LOGIN} className="text-yelp-red hover:underline">
            Log in as diner
          </Link>
        </p>
      </div>
    </div>
  );
}
