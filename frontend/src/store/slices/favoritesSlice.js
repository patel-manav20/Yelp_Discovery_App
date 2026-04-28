import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  addFavorite as addFavoriteApi,
  listMyFavorites,
  removeFavorite as removeFavoriteApi,
} from "../../services/favoriteService";

function normalizeError(err, fallback) {
  const message = err?.response?.data?.detail;
  return typeof message === "string" ? message : fallback;
}

export const fetchFavorites = createAsyncThunk(
  "favorites/fetchFavorites",
  async (_, { rejectWithValue }) => {
    try {
      const data = await listMyFavorites();
      return data?.items || [];
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not load favorites"));
    }
  },
);

export const addFavorite = createAsyncThunk(
  "favorites/addFavorite",
  async (restaurantId, { rejectWithValue }) => {
    try {
      await addFavoriteApi(restaurantId);
      return restaurantId;
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not update favorite"));
    }
  },
);

export const removeFavorite = createAsyncThunk(
  "favorites/removeFavorite",
  async (restaurantId, { rejectWithValue }) => {
    try {
      await removeFavoriteApi(restaurantId);
      return restaurantId;
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not update favorite"));
    }
  },
);

const favoritesSlice = createSlice({
  name: "favorites",
  initialState: {
    favorites: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = action.payload;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(addFavorite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addFavorite.fulfilled, (state, action) => {
        state.loading = false;
        const exists = state.favorites.some((f) => f.restaurant_id === action.payload);
        if (!exists) {
          state.favorites.push({ restaurant_id: action.payload });
        }
      })
      .addCase(addFavorite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(removeFavorite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFavorite.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = state.favorites.filter((f) => f.restaurant_id !== action.payload);
      })
      .addCase(removeFavorite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      });
  },
});

export default favoritesSlice.reducer;
