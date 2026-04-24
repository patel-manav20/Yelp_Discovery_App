import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchFavorites = createAsyncThunk(
  'favorites/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('http://localhost:8000/favorites');
      if (!response.ok) throw new Error('Failed to fetch');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  list: [],
  loading: false,
};

const favoriteSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    addFavorite: (state, action) => {
      state.list.push(action.payload);
    },
    removeFavorite: (state, action) => {
      state.list = state.list.filter(fav => fav.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchFavorites.fulfilled, (state, action) => {
      state.list = action.payload;
    });
  },
});

export const { addFavorite, removeFavorite } = favoriteSlice.actions;
export const selectFavorites = (state) => state.favorites.list;
export default favoriteSlice.reducer;