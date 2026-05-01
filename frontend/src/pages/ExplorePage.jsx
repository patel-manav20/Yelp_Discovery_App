import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChatAssistant } from "../context/ChatAssistantContext";
import RestaurantGrid from "../components/restaurants/RestaurantGrid";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import ErrorMessage from "../components/common/ErrorMessage";
import {
  searchRestaurants,
  searchYelpRestaurantsExplore,
  yelpExploreSortParam,
} from "../services/restaurantService";
import { getApiErrorMessage } from "../utils/apiError";
import { ROUTES } from "../constants/routes";
import YelpMapPanel from "../components/maps/YelpMapPanel";
import ExploreBrowseHeader from "../components/explore/ExploreBrowseHeader";
import ExploreQuickFilters from "../components/explore/ExploreQuickFilters";
import ExploreFilterDrawer from "../components/explore/ExploreFilterDrawer";
import {
  defaultExploreFilters,
  effectiveSortBy,
  effectiveAmbiance,
} from "../constants/exploreFilters";

const PAGE_LIMIT = 20;
const GENERIC_RESTAURANT_TERMS = new Set([
  "restaurant",
  "restaurants",
  "food",
  "dining",
  "eat",
  "eats",
]);

function safeExploreRowDomId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizeLocalQuery(rawQuery) {
  const trimmed = String(rawQuery || "").trim();
  if (!trimmed) return undefined;
  return GENERIC_RESTAURANT_TERMS.has(trimmed.toLowerCase()) ? undefined : trimmed;
}

export default function ExplorePage() {
  const { isAuthenticated } = useAuth();
  const chat = useChatAssistant();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [filters, setFilters] = useState(defaultExploreFilters);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlightedId, setHighlightedId] = useState(null);
  const [searchAsMapMoves, setSearchAsMapMoves] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(defaultExploreFilters);
  const [dataSource, setDataSource] = useState("yelp");
  const [yelpFallbackReason, setYelpFallbackReason] = useState("");

  const browseTitle = useMemo(() => {
    const q = searchTerm.trim();
    const c = city.trim();
    if (q && c) {
      return `Browsing ${q} · ${c}`;
    }
    if (c) {
      return `Browsing ${c} Restaurant`;
    }
    if (q) {
      return `Browsing ${q}`;
    }
    return "Browsing Restaurants";
  }, [searchTerm, city]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError("");
    const cuisineExtra =
      filters.cuisines.length > 0 ? filters.cuisines.join(" ") : "";
    const dietaryExtra = filters.dietary?.trim() || "";
    const termParts = [searchTerm.trim(), cuisineExtra, dietaryExtra].filter(Boolean);
    const yelpTerm = termParts.length ? termParts.join(" ") : "restaurants";
    const location = city.trim() || "San Jose, CA";

    const cuisine =
      filters.cuisines.length > 0 ? filters.cuisines.join(" ") : undefined;
    const localQuery = normalizeLocalQuery(searchTerm);

    try {
      const yelpPromise = searchYelpRestaurantsExplore({
        term: yelpTerm,
        city: location,
        page,
        limit: PAGE_LIMIT,
        price: filters.price ?? undefined,
        sort_by: yelpExploreSortParam(effectiveSortBy(filters)),
        open_now: filters.suggestedOpenNow === true,
      });

      const localPromise = searchRestaurants({
        query: localQuery,
        city: city.trim() || undefined,
        cuisine,
        price: filters.price ?? undefined,
        rating: filters.minRating ?? undefined,
        dietary: filters.dietary.trim() || undefined,
        ambiance: effectiveAmbiance(filters),
        sort_by: effectiveSortBy(filters),
        page,
        limit: PAGE_LIMIT,
        open_now: filters.suggestedOpenNow === true,
      });

      const [yelpSettled, localSettled] = await Promise.allSettled([
        yelpPromise,
        localPromise,
      ]);

      const yelpItems =
        yelpSettled.status === "fulfilled" ? yelpSettled.value?.items ?? [] : [];
      const yelpTotal =
        yelpSettled.status === "fulfilled" ? yelpSettled.value?.total ?? 0 : 0;
      const localItems =
        localSettled.status === "fulfilled"
          ? localSettled.value?.items ?? []
          : [];
      const localTotal =
        localSettled.status === "fulfilled" ? localSettled.value?.total ?? 0 : 0;

      const mergedItems = [...localItems, ...yelpItems];
      const effectiveSort = effectiveSortBy(filters);

      const collator = new Intl.Collator(undefined, {
        sensitivity: "base",
        numeric: true,
      });

      if (effectiveSort === "name_asc" || effectiveSort === "name_desc") {
        const direction = effectiveSort === "name_asc" ? 1 : -1;

        mergedItems.sort((a, b) => {
          const an = a?.name ? String(a.name) : "";
          const bn = b?.name ? String(b.name) : "";
          const byName = collator.compare(an, bn);
          if (byName !== 0) return byName * direction;

          const aid = a?.id != null ? String(a.id) : "";
          const bid = b?.id != null ? String(b.id) : "";
          return aid.localeCompare(bid) * direction;
        });
      } else if (effectiveSort === "rating_asc" || effectiveSort === "rating_desc") {
        const direction = effectiveSort === "rating_asc" ? 1 : -1;

        mergedItems.sort((a, b) => {
          const ar = Number(a?.average_rating) || 0;
          const br = Number(b?.average_rating) || 0;
          if (ar !== br) return (ar - br) * direction;

          const ac = Number(a?.review_count) || 0;
          const bc = Number(b?.review_count) || 0;
          if (ac !== bc) return (ac - bc) * direction;

          const an = a?.name ? String(a.name) : "";
          const bn = b?.name ? String(b.name) : "";
          const byName = collator.compare(an, bn);
          if (byName !== 0) return byName;

          const aid = a?.id != null ? String(a.id) : "";
          const bid = b?.id != null ? String(b.id) : "";
          return aid.localeCompare(bid);
        });
      }

      setItems(mergedItems.slice(0, PAGE_LIMIT));
      setTotal(localTotal + yelpTotal);

      if (yelpSettled.status === "fulfilled") {
        setDataSource("yelp");
        setYelpFallbackReason("");
        setError("");
        return;
      }

      if (localItems.length) {
        setDataSource("local");
        setYelpFallbackReason(
          getApiErrorMessage(
            yelpSettled.reason,
            "Request to Yelp failed (check API key, backend running, and browser Network tab).",
          ),
        );
        setError("");
      } else {
        setYelpFallbackReason("");
        setDataSource("local");
        setError(
          getApiErrorMessage(
            yelpSettled.reason,
            "Yelp unavailable and no local listings match. Set YELP_API_KEY in backend .env or add restaurants.",
          ),
        );
        setItems([]);
        setTotal(0);
      }
    } catch (err) {
      setYelpFallbackReason("");
      setError(getApiErrorMessage(err, "Could not load restaurants"));
      setItems([]);
      setTotal(0);
      setDataSource("local");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, city, filters, page]);

  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
    setCity(searchParams.get("city") || "");
  }, [searchParams]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (!filterDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterDrawerOpen]);

  const handleFilterChange = (next) => {
    setFilters(next);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ ...defaultExploreFilters });
    setPage(1);
  };

  const openFilterDrawer = () => {
    setDraftFilters({ ...filters });
    setFilterDrawerOpen(true);
  };

  const applyFilterDrawer = () => {
    setFilters({ ...draftFilters });
    setFilterDrawerOpen(false);
    setPage(1);
  };

  const cancelFilterDrawer = () => {
    setFilterDrawerOpen(false);
  };

  const pageBtn =
    "px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-800 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:hover:bg-white transition-colors";

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-[#f0f0f0] pb-6">
      <div className="w-full flex-1 flex flex-col min-h-0 py-0">
        <div className="flex flex-col lg:flex-row lg:items-stretch flex-1 min-h-0 lg:min-h-[calc(100vh-10.5rem)] border-y lg:border-x-0 border-[#ebebeb] bg-white shadow-sm overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col lg:border-r border-[#ebebeb]">
            <ExploreBrowseHeader
              browseTitle={browseTitle}
              sortBy={filters.sortBy}
              onSortChange={(sortBy) => handleFilterChange({ ...filters, sortBy })}
              loading={loading}
            />
            <ExploreQuickFilters
              filters={filters}
              onChange={handleFilterChange}
              onOpenFilters={openFilterDrawer}
            />

            <ExploreFilterDrawer
              open={filterDrawerOpen}
              draft={draftFilters}
              setDraft={setDraftFilters}
              onApply={applyFilterDrawer}
              onCancel={cancelFilterDrawer}
            />

            {error ? (
              <div className="px-4 pt-4">
                <ErrorMessage message={error} onDismiss={() => setError("")} />
              </div>
            ) : null}

            {yelpFallbackReason ? (
              <div className="px-4 pt-3">
                <div
                  role="status"
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
                >
                  <p className="font-semibold">You are seeing MySQL / seeded listings, not live Yelp.</p>
                  <p className="mt-1 text-amber-900/95">{yelpFallbackReason}</p>
                  <p className="mt-2 text-xs text-amber-900/85">
                    Fix: set <code className="rounded bg-white/80 px-1">YELP_API_KEY</code> in{" "}
                    <code className="rounded bg-white/80 px-1">backend/.env</code>, save, restart the API (
                    <code className="rounded bg-white/80 px-1">uvicorn</code>), then hard-refresh this page.
                  </p>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-24">
                <LoadingSpinner label="Loading restaurants…" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No restaurants found"
                  description="Try a different search, city, or loosen your filters."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setCity("");
                        resetFilters();
                        setPage(1);
                        setSearchParams({}, { replace: true });
                      }}
                      className="px-5 py-2.5 rounded-lg text-white text-sm font-bold bg-yelp-red hover:bg-yelp-red-hover transition-colors"
                    >
                      Clear search
                    </button>
                  }
                />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <RestaurantGrid
                    restaurants={items}
                    variant="yelp"
                    highlightedId={highlightedId}
                    onRowHover={setHighlightedId}
                  />
                </div>
                {total > PAGE_LIMIT ? (
                  <div className="flex justify-center items-center gap-3 py-5 border-t border-gray-100 bg-white">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={pageBtn}
                    >
                      Previous
                    </button>
                    <span className="px-2 py-2 text-sm font-medium text-gray-600">
                      Page {page} of {Math.ceil(total / PAGE_LIMIT) || 1}
                    </span>
                    <button
                      type="button"
                      disabled={page * PAGE_LIMIT >= total}
                      onClick={() => setPage((p) => p + 1)}
                      className={pageBtn}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="hidden lg:flex lg:flex-[0_0_36%] xl:flex-[0_0_34%] min-h-0 min-w-[260px] max-w-none shrink-0 flex-col border-l border-[#ebebeb] bg-[#e5e5e5]">
            <YelpMapPanel
              className="h-full min-h-0 w-full flex-1"
              restaurants={items}
              highlightedId={highlightedId}
              onMarkerClick={setHighlightedId}
              searchAsMapMoves={searchAsMapMoves}
              onSearchAsMapMovesChange={setSearchAsMapMoves}
            />
          </div>
        </div>

        <div className="lg:hidden w-full border-t border-gray-200 overflow-hidden bg-white shadow-sm">
          <YelpMapPanel
            restaurants={items}
            highlightedId={highlightedId}
            onMarkerClick={setHighlightedId}
            searchAsMapMoves={searchAsMapMoves}
            onSearchAsMapMovesChange={setSearchAsMapMoves}
          />
        </div>
      </div>

      <section className="w-full px-4 sm:px-6 lg:px-8 mt-8 max-w-7xl mx-auto">
        <div
          id="ai-chat"
          className="rounded-xl border border-gray-200 bg-white p-6 sm:p-7 shadow-card scroll-mt-28"
        >
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Dining assistant</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Open the chat bubble (bottom-right), try quick prompts like &quot;Vegan options&quot; or
            &quot;Romantic dinner,&quot; and open restaurant pages from the suggestion cards.
          </p>
          {isAuthenticated ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {["Dinner tonight", "Best rated near me", "Vegan options"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => chat.sendText(label)}
                  className="px-3 py-2 rounded-full text-xs font-semibold bg-surface-muted border border-gray-200 text-gray-800 hover:border-yelp-red/40 hover:bg-red-50/80 transition-colors"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => chat.open()}
                className="px-3 py-2 rounded-full text-xs font-bold bg-yelp-red text-white hover:bg-yelp-red-hover transition-colors"
              >
                Open chat
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                to={ROUTES.LOGIN}
                state={{
                  from: { pathname: ROUTES.EXPLORE, search: "", hash: "#ai-chat" },
                }}
                className="inline-flex justify-center px-5 py-2.5 rounded-lg text-white text-sm font-bold bg-yelp-red hover:bg-yelp-red-hover transition-colors"
              >
                Sign in to chat
              </Link>
              <button
                type="button"
                onClick={() => chat.open()}
                className="inline-flex justify-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:border-yelp-red/40 hover:bg-gray-50 transition-colors"
              >
                Preview assistant
              </button>
            </div>
          )}
          <p className="mt-4 text-xs text-gray-500">
            Signed-in users get saved history and tailored picks.
          </p>
        </div>
      </section>
    </div>
  );
}
