import { useState } from "react";

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red";

export default function PreferencesForm({
  initialValues,
  onSubmit,
  submitting = false,
}) {
  const [defaultCity, setDefaultCity] = useState(
    initialValues?.default_city ?? ""
  );
  const [priceLevel, setPriceLevel] = useState(
    initialValues?.price_level ?? null
  );
  const [cuisineInput, setCuisineInput] = useState(
    Array.isArray(initialValues?.cuisine_tags)
      ? initialValues.cuisine_tags.join(", ")
      : ""
  );
  const [errors, setErrors] = useState({});

  const parseCuisines = () => {
    return cuisineInput
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
  };

  const validate = () => {
    const next = {};
    if (defaultCity?.length > 120) next.default_city = "City name is too long";
    if (priceLevel != null && (priceLevel < 1 || priceLevel > 4)) {
      next.price_level = "Price must be 1–4";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const cuisine_tags = parseCuisines();
    const payload = {
      default_city: defaultCity.trim() || null,
      price_level: priceLevel,
      cuisine_tags: cuisine_tags.length ? cuisine_tags : null,
    };
    onSubmit?.(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="default_city" className="block text-sm font-medium text-gray-700 mb-1">
          Default search location
        </label>
        <input
          id="default_city"
          type="text"
          value={defaultCity}
          onChange={(e) => {
            setDefaultCity(e.target.value);
            if (errors.default_city) setErrors((e) => ({ ...e, default_city: null }));
          }}
          className={inputClass}
          placeholder="San Jose, CA"
          maxLength={120}
        />
        <p className="mt-1 text-xs text-gray-500">
          Used as default when you search for restaurants
        </p>
        {errors.default_city ? (
          <p className="mt-1 text-sm text-red-600">{errors.default_city}</p>
        ) : null}
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">Price range</span>
        <div className="flex gap-2 flex-wrap" role="group">
          <label
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md border-2 cursor-pointer transition-colors ${
              priceLevel === null
                ? "border-yelp-red bg-red-50 text-yelp-red"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="price_level"
              checked={priceLevel === null}
              onChange={() => setPriceLevel(null)}
              className="sr-only"
            />
            <span className="text-sm">No preference</span>
          </label>
          {[1, 2, 3, 4].map((level) => (
            <label
              key={level}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md border-2 cursor-pointer transition-colors ${
                priceLevel === level
                  ? "border-yelp-red bg-red-50 text-yelp-red"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="price_level"
                value={level}
                checked={priceLevel === level}
                onChange={() => setPriceLevel(level)}
                className="sr-only"
              />
              <span className="font-medium">{"$".repeat(level)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="cuisine_tags" className="block text-sm font-medium text-gray-700 mb-1">
          Preferred cuisines
        </label>
        <input
          id="cuisine_tags"
          type="text"
          value={cuisineInput}
          onChange={(e) => setCuisineInput(e.target.value)}
          className={inputClass}
          placeholder="Italian, Japanese, Mexican (comma-separated)"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-50 shadow-sm"
      >
        {submitting ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
