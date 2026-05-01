import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { signup } from "../services/authService";
import { ROUTES } from "../constants/routes";
import ErrorMessage from "../components/common/ErrorMessage";

export default function SignupPage() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const dn = displayName.trim();
    if (!dn) {
      setError("Display name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const { access_token, user } = await signup({
        email: email.trim(),
        password,
        display_name: dn,
      });
      setAuth(access_token, user);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Sign up failed. Try a different email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Sign up</h1>
      <p className="mt-1 text-sm text-gray-600">
        Create a diner account to discover restaurants and leave reviews
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
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
              Display name *
            </label>
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
              placeholder="How you want to be seen"
              maxLength={120}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to={ROUTES.LOGIN} className="font-medium text-yelp-red hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          Restaurant owner?{" "}
          <Link to={ROUTES.OWNER_SIGNUP} className="text-yelp-red hover:underline">
            Owner sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
