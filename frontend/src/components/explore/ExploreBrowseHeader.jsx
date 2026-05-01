const SORT_OPTIONS_UNIQUE = [
  { value: "rating_desc", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "rating_asc", label: "Lowest Rated" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
];

function SortInfoIcon() {
  return (
    <button
      type="button"
      className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      title="Recommended sorts businesses using ratings, reviews, and relevance."
      aria-label="About sort order"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
    </button>
  );
}

export default function ExploreBrowseHeader({ browseTitle, sortBy, onSortChange, loading = false }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 border-b border-[#ebebeb] bg-white">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
        {loading ? <span className="text-gray-500">Searching…</span> : browseTitle}
      </h1>
      <div className="flex items-center gap-2 shrink-0">
        <label htmlFor="explore-sort-main" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          Sort:
        </label>
        <select
          id="explore-sort-main"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="min-w-[10.5rem] border border-[#ccc] rounded-md px-2.5 py-1.5 text-sm font-semibold bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yelp-red/25 focus:border-yelp-red"
        >
          {SORT_OPTIONS_UNIQUE.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <SortInfoIcon />
      </div>
    </div>
  );
}
