import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getRestaurant,
  searchRestaurants as searchRestaurantsApi,
  searchYelpRestaurantsExplore,
} from "../../services/restaurantService";

function normalizeError(err, fallback) {
  const message = err?.response?.data?.detail;
  return typeof message === "string" ? message : fallback;
}

export const fetchRestaurants = createAsyncThunk(
  "restaurants/fetchRestaurants",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await searchRestaurantsApi(params);
      return Array.isArray(data?.items) ? data.items : [];
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not load restaurants"));
    }
  },
);

export const fetchRestaurantById = createAsyncThunk(
  "restaurants/fetchRestaurantById",
  async (id, { rejectWithValue }) => {
    try {
      return await getRestaurant(id);
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Restaurant not found"));
    }
  },
);

export const searchRestaurants = createAsyncThunk(
  "restaurants/searchRestaurants",
  async (query, { rejectWithValue }) => {
    try {
      const data = await searchYelpRestaurantsExplore({
        term: query || "restaurants",
        city: "San Jose, CA",
        page: 1,
        limit: 20,
      });
      return Array.isArray(data?.items) ? data.items : [];
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not search restaurants"));
    }
  },
);

const restaurantSlice = createSlice({
  name: "restaurants",
  initialState: {
    restaurants: [],
    currentRestaurant: null,
    loading: false,
    error: null,
    filters: {},
  },
  reducers: {
    setRestaurants(state, action) {
      state.restaurants = action.payload || [];
    },
    setRestaurantError(state, action) {
      state.error = action.payload || null;
    },
    setRestaurantLoading(state, action) {
      state.loading = Boolean(action.payload);
    },
    setFilters(state, action) {
      state.filters = action.payload || {};
    },
    clearCurrentRestaurant(state) {
      state.currentRestaurant = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurants = action.payload;
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(fetchRestaurantById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurantById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRestaurant = action.payload;
      })
      .addCase(fetchRestaurantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(searchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurants = action.payload;
      })
      .addCase(searchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      });
  },
});

export const {
  setRestaurants,
  setRestaurantError,
  setRestaurantLoading,
  setFilters,
  clearCurrentRestaurant,
} = restaurantSlice.actions;
export default restaurantSlice.reducer;
