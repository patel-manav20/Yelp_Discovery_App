
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
  distanceMode: null,
};

const cuisineOptions = ["Italian", "Japanese", "Mexican", "American", "Indian"];

export { cuisineOptions };

export function effectiveSortBy(filters) {
  return filters.sortBy || "rating_desc";
}

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
