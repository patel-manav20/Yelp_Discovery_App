
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
  WRITE_REVIEW: "/write-review",
  RESTAURANTS_NEW: "/restaurants/new",
};

export function restaurantPath(id) {
  return `/restaurants/${id}`;
}

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
