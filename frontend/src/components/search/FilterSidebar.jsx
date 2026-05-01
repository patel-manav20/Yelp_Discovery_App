import { useState } from "react";

const defaultBrowse = {
  price: [],
  cuisines: [],
  openNow: false,
};

const defaultExplore = {
  price: null,
  cuisines: [],
  sortBy: "rating_desc",
  minRating: null,
  dietary: "",
  ambiance: "",
};

const cuisineOptions = ["Italian", "Japanese", "Mexican", "American", "Indian"];

const sortOptions = [
  { value: "rating_desc", label: "Highest rated" },
  { value: "rating_asc", label: "Lowest rated" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "newest", label: "Newest" },
];

export default function FilterSidebar({
  mode = "browse",
  value,
  onChange,
  className = "",
  sticky = true,
  compact = false,
}) {
  const defaults = mode === "explore" ? defaultExplore : defaultBrowse;
  const [internal, setInternal] = useState(defaults);
  const filters = value ?? internal;

  const setFilters = (next) => {
    if (onChange) onChange(next);
    else setInternal(next);
  };

  const togglePriceBrowse = (level) => {
    const next = filters.price.includes(level)
      ? filters.price.filter((p) => p !== level)
      : [...filters.price, level];
    setFilters({ ...filters, price: next });
  };

  const setPriceExplore = (level) => {
    const next = filters.price === level ? null : level;
    setFilters({ ...filters, price: next });
  };

  const toggleCuisine = (tag) => {
    const next = filters.cuisines.includes(tag)
      ? filters.cuisines.filter((c) => c !== tag)
      : [...filters.cuisines, tag];
    setFilters({ ...filters, cuisines: next });
  };

  const reset = () => {
    setFilters({ ...defaults });
  };

  return (
    <aside
      className={`rounded-xl border border-gray-200 bg-white shadow-card ${sticky ? "lg:sticky lg:top-24" : ""} ${className}`}
    >
      <div className={`border-b border-gray-100 px-5 py-4 bg-surface-subtle/60 ${compact ? "py-3" : ""}`}>
        <h2 className="text-base font-bold text-gray-900 tracking-tight">
          {compact ? "More filters" : "Filters"}
        </h2>
      </div>

      <div className={`p-5 space-y-6 ${compact ? "pt-4" : ""}`}>
        {mode === "explore" && !compact ? (
          <section>
            <label htmlFor="explore-sort" className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
              Sort
            </label>
            <select
              id="explore-sort"
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>
        ) : null}

        {mode === "explore" && !compact ? (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Min rating</h3>
            <select
              value={filters.minRating ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setFilters({
                  ...filters,
                  minRating: v === "" ? null : Number(v),
                });
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
            >
              <option value="">Any</option>
              <option value="3">3+ stars</option>
              <option value="3.5">3.5+ stars</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </section>
        ) : null}

        {!(mode === "explore" && compact) ? (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Price</h3>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() =>
                  mode === "explore" ? setPriceExplore(level) : togglePriceBrowse(level)
                }
                className={`px-3 py-2 rounded-full text-sm border transition-colors duration-200 ${
                  (mode === "explore"
                    ? filters.price === level
                    : filters.price.includes(level))
                    ? "border-yelp-red bg-red-50 text-yelp-red font-semibold shadow-sm"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {"$".repeat(level)}
              </button>
            ))}
          </div>
          {mode === "explore" ? (
            <p className="text-xs text-gray-500 mt-1">Tap again to clear</p>
          ) : null}
        </section>
        ) : null}

        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Cuisine</h3>
          <ul className="space-y-2">
            {cuisineOptions.map((tag) => (
              <li key={tag}>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={filters.cuisines.includes(tag)}
                    onChange={() => toggleCuisine(tag)}
                    className="rounded border-gray-300 text-yelp-red focus:ring-yelp-red"
                  />
                  {tag}
                </label>
              </li>
            ))}
          </ul>
        </section>

        {mode === "explore" ? (
          <>
            <section>
              <label htmlFor="dietary-filter" className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                Dietary
              </label>
              <input
                id="dietary-filter"
                type="text"
                value={filters.dietary}
                onChange={(e) => setFilters({ ...filters, dietary: e.target.value })}
                placeholder="e.g. vegan, gluten-free"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
              />
            </section>
            <section>
              <label htmlFor="ambiance-filter" className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                Ambiance
              </label>
              <input
                id="ambiance-filter"
                type="text"
                value={filters.ambiance}
                onChange={(e) => setFilters({ ...filters, ambiance: e.target.value })}
                placeholder="e.g. casual, date night"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red"
              />
            </section>
          </>
        ) : (
          <section>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
              <input
                type="checkbox"
                checked={filters.openNow}
                onChange={(e) =>
                  setFilters({ ...filters, openNow: e.target.checked })
                }
                className="rounded border-gray-300 text-yelp-red focus:ring-yelp-red"
              />
              Open now
            </label>
          </section>
        )}

        <button
          type="button"
          onClick={reset}
          className="w-full py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
        >
          Clear filters
        </button>
      </div>
    </aside>
  );
}
