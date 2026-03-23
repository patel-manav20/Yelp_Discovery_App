/**
 * Central route paths for links, redirects, and documentation.
 * Parameterized paths stay as string patterns in AppRoutes (react-router).
 */

export const ROUTES = {
  HOME: "/",
  EXPLORE: "/explore",
  LOGIN: "/login",
  SIGNUP: "/signup",
  OWNER_LOGIN: "/owner/login",
  OWNER_SIGNUP: "/owner/signup",
  OWNER_DASHBOARD: "/owner",
  PROFILE: "/profile",
  PREFERENCES: "/preferences",
  FAVORITES: "/favorites",
  HISTORY: "/history",
  /** Yelp-style hub: search + “visited recently” cards before picking a listing */
  WRITE_REVIEW: "/write-review",
  RESTAURANTS_NEW: "/restaurants/new",
};

/** Detail / nested restaurant URLs */
export function restaurantPath(id) {
  return `/restaurants/${id}`;
}

/** In-app detail for a Yelp Fusion business id (loads via ``GET /restaurants/yelp/{id}``). */
export function restaurantYelpPath(yelpBusinessId) {
  return `/restaurants/yelp/${encodeURIComponent(String(yelpBusinessId))}`;
}

export function restaurantYelpReviewPath(yelpBusinessId) {
  return `${restaurantYelpPath(yelpBusinessId)}/review`;
}

export function restaurantEditPath(id) {
  return `/restaurants/${id}/edit`;
}

export function restaurantReviewPath(id) {
  return `/restaurants/${id}/review`;
}

export function restaurantClaimPath(id) {
  return `/restaurants/${id}/claim`;
}
