import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "../components/search/SearchBar";
import { useAuth } from "../hooks/useAuth";
import { searchRestaurants } from "../services/restaurantService";
import { getHistory } from "../services/userService";
import { getRestaurantImageFallback } from "../utils/restaurantImage";
import { getApiErrorMessage } from "../utils/apiError";
import { ROUTES } from "../constants/routes";
import LoadingSpinner from "../components/common/LoadingSpinner";

function ReviewHeroIllustration() {
  return (
    <div
      className="relative w-full max-w-[320px] mx-auto lg:mx-0 shrink-0"
      aria-hidden
    >
      <svg viewBox="0 0 320 240" className="w-full h-auto text-yelp-red">
        <g fill="#d1d5db" opacity="0.85">
          <rect x="20" y="140" width="28" height="80" rx="2" />
          <rect x="52" y="120" width="36" height="100" rx="2" />
          <rect x="92" y="150" width="24" height="70" rx="2" />
          <rect x="120" y="100" width="40" height="120" rx="2" />
          <rect x="164" y="130" width="32" height="90" rx="2" />
          <rect x="200" y="115" width="44" height="105" rx="2" />
          <rect x="248" y="145" width="52" height="75" rx="2" />
        </g>
        <g fill="currentColor">
          <path
            transform="translate(175,48) scale(0.55)"
            d="M10 1.5l2.5 6.5 7 .5-5.5 4.5 2 6.8L10 15.8 3.5 19.3l2-6.8L0 8.5l7-.5z"
          />
          <path
            transform="translate(200,32) scale(0.7)"
            d="M10 1.5l2.5 6.5 7 .5-5.5 4.5 2 6.8L10 15.8 3.5 19.3l2-6.8L0 8.5l7-.5z"
          />
          <path
            transform="translate(232,22) scale(0.85)"
            d="M10 1.5l2.5 6.5 7 .5-5.5 4.5 2 6.8L10 15.8 3.5 19.3l2-6.8L0 8.5l7-.5z"
          />
          <path
            transform="translate(268,14) scale(1)"
            d="M10 1.5l2.5 6.5 7 .5-5.5 4.5 2 6.8L10 15.8 3.5 19.3l2-6.8L0 8.5l7-.5z"
          />
        </g>
        <ellipse cx="118" cy="208" rx="36" ry="8" fill="#000" opacity="0.08" />
        <circle cx="118" cy="118" r="22" fill="#fca5a5" />
        <path
          d="M118 140 L108 175 L128 175 Z"
          fill="#6b7280"
        />
        <rect x="96" y="168" width="44" height="36" rx="6" fill="#374151" />
        <path
          d="M142 72 L248 18 L262 42 L156 96 Z"
          fill="#d32323"
        />
        <path d="M248 18 L262 42 L272 36 L258 12 Z" fill="#fecaca" />
      </svg>
    </div>
  );
}

function StarPickerBoxes({ value, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-md border flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yelp-red focus-visible:ring-offset-1 ${
            n <= value
              ? "border-yelp-red/40 bg-red-50 text-yelp-red"
              : "border-[#ebebeb] bg-[#fafafa] text-gray-300 hover:border-gray-300"
          }`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function SuggestionCard({ restaurant, onDismiss, onRate }) {
  const { id, name, primary_photo_url, cuisine_tags } = restaurant;
  const img = primary_photo_url || getRestaurantImageFallback(name, cuisine_tags);

  return (
    <article className="relative flex rounded-lg border border-[#ebebeb] bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label={`Dismiss ${name}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
      <div className="w-[108px] sm:w-[128px] shrink-0 self-stretch min-h-[120px] bg-gray-100">
        <img src={img} alt="" className="h-full w-full object-cover min-h-[120px]" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0 p-3 sm:p-4 pr-10">
        <Link
          to={`/restaurants/${id}`}
          className="font-bold text-[#2d2e2f] text-base hover:text-yelp-red hover:underline line-clamp-2"
        >
          {name}
        </Link>
        <p className="text-sm text-[#6e7072] mt-2">Do you recommend this business?</p>
        <div className="mt-3">
          <StarPickerBoxes value={0} onPick={(stars) => onRate(id, stars)} />
        </div>
      </div>
    </article>
  );
}

async function loadSuggestionRestaurants(isAuthenticated) {
  const merged = [];
  const seen = new Set();

  if (isAuthenticated) {
    try {
      const hist = await getHistory({ limit: 80, offset: 0 });
      for (const e of hist.items || []) {
        const r = e.restaurant;
        if (r?.id != null && !seen.has(r.id)) {
          seen.add(r.id);
          merged.push(r);
          if (merged.length >= 6) return merged;
        }
      }
    } catch {
    }
  }

  try {
    const data = await searchRestaurants({
      limit: 12,
      sort_by: "rating_desc",
      page: 1,
    });
    for (const r of data.items || []) {
      if (r?.id != null && !seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
        if (merged.length >= 6) break;
      }
    }
  } catch {
  }

  return merged;
}

export default function WriteReviewHubPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [locationInput, setLocationInput] = useState("San Jose, CA");
  const [list, setList] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await loadSuggestionRestaurants(isAuthenticated);
        if (!cancelled) setList(rows);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load suggestions"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const visible = useMemo(
    () => list.filter((r) => !dismissed.has(r.id)),
    [list, dismissed]
  );

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      const p = new URLSearchParams();
      if (query.trim()) p.set("q", query.trim());
      if (locationInput.trim()) p.set("city", locationInput.trim());
      navigate(`${ROUTES.EXPLORE}?${p.toString()}`);
    },
    [query, locationInput, navigate]
  );

  const handleDismiss = (id) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const handleRate = (restaurantId, stars) => {
    navigate(`/restaurants/${restaurantId}/review?stars=${stars}`);
  };

  return (
    <div className="w-full bg-white flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 pb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-14">
          <div className="flex-1 min-w-0 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#2d2e2f] tracking-tight">
              Find a business to review
            </h1>
            <p className="mt-3 text-base sm:text-lg text-[#6e7072] leading-relaxed">
              Review anything from your favorite patio spot to your local flower shop.
            </p>
            <div className="mt-8">
              <SearchBar
                searchTerm={query}
                location={locationInput}
                onSearchTermChange={setQuery}
                onLocationChange={setLocationInput}
                onSubmit={handleSearch}
                iconSubmit
                findPlaceholder="Try lunch, yoga studio, plumber"
                locationPlaceholder="San Jose, CA"
                className="max-w-xl"
              />
            </div>
          </div>
          <ReviewHeroIllustration />
        </div>

        <section className="mt-16 sm:mt-20">
          <h2 className="text-xl sm:text-2xl font-bold text-[#2d2e2f] mb-6">
            Visited one of these places recently?
          </h2>

          {error ? (
            <p className="text-sm text-yelp-red mb-4" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner label="Loading suggestions…" />
            </div>
          ) : visible.length === 0 ? (
            <p className="text-[#6e7072] text-sm max-w-lg">
              No suggestions right now. Use the search above to find a business, or{" "}
              <Link to={ROUTES.EXPLORE} className="text-[#0073bb] font-semibold hover:underline">
                browse Explore
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {visible.map((r) => (
                <SuggestionCard
                  key={r.id}
                  restaurant={r}
                  onDismiss={handleDismiss}
                  onRate={handleRate}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
