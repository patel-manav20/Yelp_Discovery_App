import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import restaurantsReducer from "./slices/restaurantSlice";
import reviewsReducer from "./slices/reviewSlice";
import favoritesReducer from "./slices/favoritesSlice";

// Redux DevTools are off in production by default (Vite). Enable for lab screenshots:
//   npm run dev  → always on
//   Docker/AWS → build with --build-arg VITE_ENABLE_REDUX_DEVTOOLS=true
const reduxDevtoolsEnabled =
  Boolean(import.meta.env.DEV) ||
  import.meta.env.VITE_ENABLE_REDUX_DEVTOOLS === "true";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    restaurants: restaurantsReducer,
    reviews: reviewsReducer,
    favorites: favoritesReducer,
  },
  devTools: reduxDevtoolsEnabled ? { name: "Yelp Discovery" } : false,
});
