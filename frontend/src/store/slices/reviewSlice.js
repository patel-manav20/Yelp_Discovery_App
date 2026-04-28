import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createReview as createReviewApi,
  deleteReview as deleteReviewApi,
  listReviewsForRestaurant,
  updateReview as updateReviewApi,
} from "../../services/reviewService";

function normalizeError(err, fallback) {
  const message = err?.response?.data?.detail;
  return typeof message === "string" ? message : fallback;
}

export const fetchReviews = createAsyncThunk(
  "reviews/fetchReviews",
  async (restaurantId, { rejectWithValue }) => {
    try {
      const data = await listReviewsForRestaurant(restaurantId, { page: 1, limit: 50 });
      return {
        reviews: data?.items || [],
      };
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not load reviews"));
    }
  },
);

export const createReview = createAsyncThunk(
  "reviews/createReview",
  async (payload, { rejectWithValue }) => {
    try {
      await createReviewApi(payload);
      return payload;
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not post review"));
    }
  },
);

export const updateReview = createAsyncThunk(
  "reviews/updateReview",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      await updateReviewApi(id, payload);
      return { id, ...payload };
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not update review"));
    }
  },
);

export const deleteReview = createAsyncThunk(
  "reviews/deleteReview",
  async (id, { rejectWithValue }) => {
    try {
      await deleteReviewApi(id);
      return id;
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Could not delete review"));
    }
  },
);

const reviewSlice = createSlice({
  name: "reviews",
  initialState: {
    reviews: [],
    myReviews: [],
    loading: false,
    error: null,
    submitStatus: "idle",
  },
  reducers: {
    clearSubmitStatus(state) {
      state.submitStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload.reviews;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(createReview.pending, (state) => {
        state.submitStatus = "pending";
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state) => {
        state.submitStatus = "success";
      })
      .addCase(createReview.rejected, (state, action) => {
        state.submitStatus = "error";
        state.error = action.payload || action.error.message || null;
      })
      .addCase(updateReview.pending, (state) => {
        state.submitStatus = "pending";
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state) => {
        state.submitStatus = "success";
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.submitStatus = "error";
        state.error = action.payload || action.error.message || null;
      })
      .addCase(deleteReview.pending, (state) => {
        state.submitStatus = "pending";
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.submitStatus = "success";
        state.reviews = state.reviews.filter((r) => r.id !== action.payload);
        state.myReviews = state.myReviews.filter((r) => r.id !== action.payload);
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.submitStatus = "error";
        state.error = action.payload || action.error.message || null;
      });
  },
});

export const { clearSubmitStatus } = reviewSlice.actions;
export default reviewSlice.reducer;
