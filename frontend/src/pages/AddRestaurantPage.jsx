import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRestaurant } from "../services/restaurantService";
import RestaurantPhotoUploadSection from "../components/restaurants/RestaurantPhotoUploadSection";
import ErrorMessage from "../components/common/ErrorMessage";
import { getApiErrorMessage } from "../utils/apiError";
import { ROUTES } from "../constants/routes";

const input =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red";
const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

function parseTags(str) {
  if (!str?.trim()) return null;
  const tags = str
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
  return tags.length ? tags : null;
}

function toCompactTime(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(":", "");
}

function toDisplayTime(compact) {
  if (!compact || compact.length !== 4) return compact || "";
  return `${compact.slice(0, 2)}:${compact.slice(2)}`;
}

export default function AddRestaurantPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [hours, setHours] = useState([]);
  const [hoursDraft, setHoursDraft] = useState({
    day: 0,
    from: "",
    to: "",
  });
  const [form, setForm] = useState({
    name: "",
    description: "",
    address_line: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    phone: "",
    website_url: "",
    latitude: "",
    longitude: "",
    price_level: "",
    cuisine_tags: "",
    dietary_tags: "",
    ambiance_tags: "",
  });

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Restaurant name is required");
      return;
    }
    if (!form.city.trim()) {
      setError("City is required");
      return;
    }
    if ((hoursDraft.from && !hoursDraft.to) || (!hoursDraft.from && hoursDraft.to)) {
      setError("Set both 'from' and 'to' time before saving listing.");
      return;
    }
    setSubmitting(true);
    try {
      const lat = form.latitude.trim() ? Number(form.latitude) : null;
      const lng = form.longitude.trim() ? Number(form.longitude) : null;
      const price = form.price_level ? Number(form.price_level) : null;
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        address_line: form.address_line.trim() || null,
        city: form.city.trim(),
        state: form.state.trim() || null,
        postal_code: form.postal_code.trim() || null,
        country: form.country.trim() || "US",
        phone: form.phone.trim() || null,
        website_url: form.website_url.trim() || null,
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
        price_level: price && price >= 1 && price <= 4 ? price : null,
        cuisine_tags: parseTags(form.cuisine_tags),
        dietary_tags: parseTags(form.dietary_tags),
        ambiance_tags: parseTags(form.ambiance_tags),
        hours: hours.length ? hours : null,
        photo_urls: photoUrls.slice(0, 10),
      };
      const created = await createRestaurant(body);
      navigate(`/restaurants/${created.id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create listing"));
    } finally {
      setSubmitting(false);
    }
  };

  const addHoursRow = () => {
    if (!hoursDraft.from || !hoursDraft.to) {
      setError("Choose both 'from' and 'to' time.");
      return;
    }
    const start = toCompactTime(hoursDraft.from);
    const end = toCompactTime(hoursDraft.to);
    if (!start || !end || start >= end) {
      setError("'To' time must be after 'from' time.");
      return;
    }
    setHours((prev) =>
      [...prev, { day: Number(hoursDraft.day), start, end }].sort(
        (a, b) => a.day - b.day || a.start.localeCompare(b.start)
      )
    );
    setHoursDraft((d) => ({ ...d, from: "", to: "" }));
    if (error) setError("");
  };

  const removeHoursRow = (idx) => {
    setHours((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 pb-12">
      <div className="mb-6">
        <Link to={ROUTES.EXPLORE} className="text-sm text-yelp-red hover:underline">
          ← Back to explore
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Add a restaurant</h1>
        <p className="text-sm text-gray-600 mt-1">
          List a new place for others to discover and review.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-6"
      >
        {error ? <ErrorMessage message={error} onDismiss={() => setError("")} /> : null}

        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Basics
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input className={input} value={form.name} onChange={set("name")} required maxLength={255} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className={`${input} min-h-[100px] resize-y`}
                value={form.description}
                onChange={set("description")}
                rows={4}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Location
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
              <input className={input} value={form.address_line} onChange={set("address_line")} maxLength={255} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input className={input} value={form.city} onChange={set("city")} required maxLength={120} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input className={input} value={form.state} onChange={set("state")} placeholder="CA" maxLength={64} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input className={input} value={form.postal_code} onChange={set("postal_code")} maxLength={20} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input className={input} value={form.country} onChange={set("country")} maxLength={64} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input className={input} type="text" inputMode="decimal" value={form.latitude} onChange={set("latitude")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input className={input} type="text" inputMode="decimal" value={form.longitude} onChange={set("longitude")} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Contact
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className={input} value={form.phone} onChange={set("phone")} maxLength={32} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input className={input} type="url" value={form.website_url} onChange={set("website_url")} maxLength={512} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price level</label>
              <select className={input} value={form.price_level} onChange={set("price_level")}>
                <option value="">Not set</option>
                <option value="1">$</option>
                <option value="2">$$</option>
                <option value="3">$$$</option>
                <option value="4">$$$$</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine tags</label>
              <input
                className={input}
                value={form.cuisine_tags}
                onChange={set("cuisine_tags")}
                placeholder="Italian, Mexican, …"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dietary tags</label>
              <input className={input} value={form.dietary_tags} onChange={set("dietary_tags")} placeholder="vegan, gluten-free" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ambiance tags</label>
              <input className={input} value={form.ambiance_tags} onChange={set("ambiance_tags")} placeholder="casual, date night" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business hours</label>
              <div className="rounded-md border border-gray-200 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    className={`${input} sm:col-span-2`}
                    value={hoursDraft.day}
                    onChange={(e) => setHoursDraft((d) => ({ ...d, day: Number(e.target.value) }))}
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={input}
                    type="time"
                    value={hoursDraft.from}
                    onChange={(e) => setHoursDraft((d) => ({ ...d, from: e.target.value }))}
                  />
                  <input
                    className={input}
                    type="time"
                    value={hoursDraft.to}
                    onChange={(e) => setHoursDraft((d) => ({ ...d, to: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={addHoursRow}
                  className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Save day and time
                </button>

                {hours.length ? (
                  <div className="space-y-2 pt-1">
                    {hours.map((h, idx) => (
                      <div
                        key={`${h.day}-${h.start}-${h.end}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <span className="text-sm text-gray-800">
                          {DAYS.find((d) => d.value === h.day)?.label || `Day ${h.day}`}:
                          {" "}
                          {toDisplayTime(h.start)} - {toDisplayTime(h.end)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeHoursRow(idx)}
                          className="text-sm font-semibold text-yelp-red hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Add one or more day/time ranges. These will show on the restaurant details page.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
              <p className="text-xs text-gray-600 mb-3">Browse from your computer.</p>
              <RestaurantPhotoUploadSection urls={photoUrls} onUrlsChange={setPhotoUrls} maxPhotos={10} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create listing"}
          </button>
          <Link to={ROUTES.EXPLORE} className="px-6 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
