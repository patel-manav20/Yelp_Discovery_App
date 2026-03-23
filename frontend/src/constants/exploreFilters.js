/**
 * Explore search filter shape (quick chips + filter drawer).
 * `suggestedOpenNow` maps to Yelp `open_now` and local DB hours filtering.
 * Some other flags are UI-only until the API stores payment / amenities.
 */

export const defaultExploreFilters = {
  price: null,
  cuisines: [],
  sortBy: "rating_desc",
  minRating: null,
  dietary: "",
  ambiance: "",
  suggestedKids: false,
  suggestedGroups: false,
  suggestedOpenNow: false,
  suggestedApplePay: false,
  suggestedCrypto: false,
  featureDogs: false,
  featureCreditCards: false,
  featureOpenToAll: false,
  featureAppointment: false,
  featureCoatCheck: false,
  featureFlowerDelivery: false,
  /** null = no distance filter; UI-only until backend supports radius */
  distanceMode: null,
};

const cuisineOptions = ["Italian", "Japanese", "Mexican", "American", "Indian"];

export { cuisineOptions };

/** Effective sort for GET /restaurants */
export function effectiveSortBy(filters) {
  return filters.sortBy || "rating_desc";
}

/** Effective ambiance keyword for GET /restaurants */
export function effectiveAmbiance(filters) {
  if (filters.suggestedKids && filters.suggestedGroups) return "family";
  if (filters.suggestedKids) return "family_friendly";
  if (filters.suggestedGroups) return "group";
  const a = filters.ambiance?.trim();
  return a || undefined;
}

export function isDefaultExploreFilters(f) {
  const d = defaultExploreFilters;
  return (
    f.price == null &&
    (f.cuisines?.length ?? 0) === 0 &&
    f.sortBy === d.sortBy &&
    f.minRating == null &&
    !(f.dietary?.trim()) &&
    !(f.ambiance?.trim()) &&
    !f.suggestedKids &&
    !f.suggestedGroups &&
    !f.suggestedOpenNow &&
    !f.suggestedApplePay &&
    !f.suggestedCrypto &&
    !f.featureDogs &&
    !f.featureCreditCards &&
    !f.featureOpenToAll &&
    !f.featureAppointment &&
    !f.featureCoatCheck &&
    !f.featureFlowerDelivery &&
    f.distanceMode == null
  );
}
