import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ProfileForm from "../components/profile/ProfileForm";
import {
  getProfile,
  updateProfile,
} from "../services/userService";
import { ROUTES } from "../constants/routes";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getProfile();
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setError("Could not load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (payload) => {
    setError("");
    setSubmitting(true);
    try {
      const updated = await updateProfile(payload);
      setProfile(updated);
      refreshUser();
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading profile…" />;
  }

  const initialValues = profile ?? user;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <div className="flex gap-4 text-sm font-medium">
          <Link to={ROUTES.PREFERENCES} className="text-yelp-red hover:underline">
            Preferences
          </Link>
          <Link to={ROUTES.HISTORY} className="text-yelp-red hover:underline">
            Activity
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error ? (
          <ErrorMessage
            message={error}
            onDismiss={() => setError("")}
            className="mb-4"
          />
        ) : null}

        <ProfileForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
