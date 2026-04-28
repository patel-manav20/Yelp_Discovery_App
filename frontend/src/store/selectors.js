export const selectAuth = (state) => state.auth;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

export const selectRestaurantsState = (state) => state.restaurants;
export const selectRestaurants = (state) => state.restaurants.restaurants;
export const selectCurrentRestaurant = (state) => state.restaurants.currentRestaurant;
export const selectRestaurantLoading = (state) => state.restaurants.loading;
export const selectRestaurantError = (state) => state.restaurants.error;
export const selectRestaurantFilters = (state) => state.restaurants.filters;

export const selectReviewsState = (state) => state.reviews;
export const selectReviews = (state) => state.reviews.reviews;
export const selectMyReviews = (state) => state.reviews.myReviews;
export const selectReviewLoading = (state) => state.reviews.loading;
export const selectReviewError = (state) => state.reviews.error;
export const selectReviewSubmitStatus = (state) => state.reviews.submitStatus;

export const selectFavoritesState = (state) => state.favorites;
export const selectFavorites = (state) => state.favorites.favorites;
export const selectFavoritesLoading = (state) => state.favorites.loading;
export const selectFavoritesError = (state) => state.favorites.error;
