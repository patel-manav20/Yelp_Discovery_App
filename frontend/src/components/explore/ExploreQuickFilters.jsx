import { isDefaultExploreFilters } from "../../constants/exploreFilters";

const chipBase =
  "inline-flex items-center justify-center rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors border-[#d3d3d3] bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50";

function SlidersIcon({ className }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export default function ExploreQuickFilters({ filters, onChange, onOpenFilters }) {
  const { price, sortBy, suggestedKids, suggestedGroups, suggestedOpenNow, suggestedApplePay } =
    filters;

  const set = (patch) => onChange({ ...filters, ...patch });

  const isAll = isDefaultExploreFilters(filters);

  return (
    <div className="px-4 sm:px-5 py-3 border-b border-[#ebebeb] bg-white overflow-x-auto">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => onOpenFilters?.()}
          className={`${chipBase} gap-1.5 ${
            !isAll ? "border-gray-800 bg-gray-50" : ""
          }`}
        >
          <SlidersIcon className="text-gray-600 shrink-0" />
          All
        </button>

        <div className="relative inline-flex items-center">
          <span className="sr-only">Price</span>
          <select
            aria-label="Price"
            value={price ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              set({ price: v === "" ? null : Number(v) });
            }}
            className={`${chipBase} appearance-none cursor-pointer pr-8`}
          >
            <option value="">Price</option>
            <option value="1">$</option>
            <option value="2">$$</option>
            <option value="3">$$$</option>
            <option value="4">$$$$</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
            ▾
          </span>
        </div>

        <button
          type="button"
          onClick={() => set({ suggestedOpenNow: !suggestedOpenNow })}
          className={`${chipBase} ${
            suggestedOpenNow ? "border-yelp-red text-yelp-red bg-red-50" : ""
          }`}
        >
          Open Now
        </button>

        <button
          type="button"
          onClick={() => {
            if (sortBy === "newest") set({ sortBy: "rating_desc" });
            else set({ sortBy: "newest", price: null });
          }}
          className={`${chipBase} ${
            sortBy === "newest" ? "border-yelp-red text-yelp-red bg-red-50" : ""
          }`}
        >
          Hot and New
        </button>

        <button
          type="button"
          onClick={() => set({ suggestedKids: !suggestedKids })}
          className={`${chipBase} ${
            suggestedKids ? "border-yelp-red text-yelp-red bg-red-50" : ""
          }`}
        >
          Good for Kids
        </button>

        <button
          type="button"
          onClick={() => set({ suggestedGroups: !suggestedGroups })}
          className={`${chipBase} ${
            suggestedGroups ? "border-yelp-red text-yelp-red bg-red-50" : ""
          }`}
        >
          Good for Groups
        </button>

        <button
          type="button"
          onClick={() => set({ suggestedApplePay: !suggestedApplePay })}
          className={`${chipBase} hidden sm:inline-flex ${
            suggestedApplePay ? "border-yelp-red text-yelp-red bg-red-50" : ""
          }`}
        >
          Accepts Apple Pay
        </button>
      </div>
    </div>
  );
}
