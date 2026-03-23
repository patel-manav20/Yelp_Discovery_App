import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PreferencesForm from "../components/profile/PreferencesForm";
import { getPreferences, updatePreferences } from "../services/userService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { ROUTES } from "../constants/routes";

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getPreferences();
        if (!cancelled) setPrefs(data);
      } catch {
        if (!cancelled) setError("Could not load preferences");
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
      const updated = await updatePreferences(payload);
      setPrefs(updated);
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading preferences…" />;
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dining preferences</h1>
        <Link
          to={ROUTES.PROFILE}
          className="text-sm font-medium text-yelp-red hover:underline"
        >
          Profile
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error ? (
          <ErrorMessage
            message={error}
            onDismiss={() => setError("")}
            className="mb-4"
          />
        ) : null}

        <PreferencesForm
          initialValues={prefs}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
