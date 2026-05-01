
function MagnifyingGlassIcon({ className }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export default function SearchBar({
  searchTerm = "",
  location = "",
  onSearchTermChange,
  onLocationChange,
  onSubmit,
  submitLabel = "Search",
  variant = "default",
  className = "",
  findPlaceholder = "Explore Restaurant, Cafe, Bar",
  locationPlaceholder = "San Jose, CA",
  iconSubmit = false,
}) {
  const isHero = variant === "hero";
  const isOverlay = variant === "overlay";
  const inputPad =
    isHero || isOverlay ? "py-3.5 sm:py-4 px-4 text-base" : "py-2.5 px-3.5 text-sm sm:text-[15px]";
  const btnPad = isHero || isOverlay ? "px-7 sm:px-8 py-3.5 sm:py-4 text-base" : "px-5 sm:px-6 py-2.5 text-sm font-semibold";

  const shellBorder = iconSubmit
    ? "rounded-md border border-[#d3d3d3] shadow-sm bg-white"
    : "rounded-xl border border-gray-300 bg-white shadow-card";

  return (
    <form
      onSubmit={onSubmit}
      className={`flex flex-col gap-0 sm:flex-row sm:items-stretch ${className}`}
    >
      <div
        className={`flex flex-1 min-w-0 flex-col sm:flex-row bg-white overflow-hidden transition-shadow focus-within:border-yelp-red focus-within:ring-1 focus-within:ring-yelp-red/20 ${shellBorder}`}
      >
        <label className="sr-only" htmlFor="search-q">
          Find
        </label>
        <input
          id="search-q"
          type="text"
          name="q"
          autoComplete="off"
          placeholder={findPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchTermChange?.(e.target.value)}
          className={`flex-1 min-w-0 border-0 bg-transparent text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 ${inputPad}`}
        />
        <div className="flex shrink-0 border-t border-[#ebebeb] sm:border-t-0 sm:border-l sm:border-[#ebebeb]">
          <label className="sr-only" htmlFor="search-loc">
            Near
          </label>
          <input
            id="search-loc"
            type="text"
            name="location"
            autoComplete="off"
            placeholder={locationPlaceholder}
            value={location}
            onChange={(e) => onLocationChange?.(e.target.value)}
            className={`w-full sm:w-36 md:w-44 lg:w-52 border-0 bg-transparent text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 ${inputPad}`}
          />
        </div>
        <button
          type="submit"
          title="Search"
          className={`shrink-0 whitespace-nowrap bg-yelp-red text-white font-semibold hover:bg-yelp-red-hover active:bg-yelp-red-hover border-t border-yelp-red-hover/20 sm:border-t-0 sm:border-l border-[#ebebeb] transition-colors flex items-center justify-center ${
            iconSubmit ? "w-12 sm:w-[3.25rem] px-0 sm:px-0 py-0 min-h-[2.75rem] sm:min-h-0" : btnPad
          }`}
        >
          {iconSubmit ? (
            <>
              <span className="sr-only">{submitLabel}</span>
              <MagnifyingGlassIcon className="text-white" />
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
