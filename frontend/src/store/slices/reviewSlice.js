import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchReviews = createAsyncThunk(
  'reviews/fetch',
  async (restaurantId, { rejectWithValue }) => {
    try {
      const response = await fetch(`http://localhost:8000/restaurants/${restaurantId}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createReview = createAsyncThunk(
  'reviews/create',
  async ({ restaurantId, rating, title, text }, { rejectWithValue }) => {
    try {
      const response = await fetch(`http://localhost:8000/restaurants/${restaurantId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, text }),
      });
      if (!response.ok) throw new Error('Failed to create');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  list: [],
  loading: false,
  error: null,
};

const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export const selectReviews = (state) => state.reviews.list;
export default reviewSlice.reducer;