import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { clearToken, getToken, setToken } from "../../utils/storage";
import { getCurrentUser, login, ownerSignup, signup } from "../../services/authService";

const USER_KEY = "restaurant_lab_user";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAuth(accessToken, user) {
  setToken(accessToken);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function clearPersistedAuth() {
  clearToken();
  localStorage.removeItem(USER_KEY);
}

function normalizeError(err, fallback) {
  const message = err?.response?.data?.detail;
  return typeof message === "string" ? message : fallback;
}

export const initializeAuth = createAsyncThunk(
  "auth/initializeAuth",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return { user: null, token: null };
    try {
      const user = await getCurrentUser();
      persistAuth(token, user);
      return { user, token };
    } catch (err) {
      clearPersistedAuth();
      return rejectWithValue(normalizeError(err, "Session expired. Please log in again."));
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await login(credentials.email, credentials.password);
      const token = data?.access_token ?? null;
      const user = data?.user ?? null;
      if (!token || !user) {
        return rejectWithValue("Login failed. Missing auth payload.");
      }
      persistAuth(token, user);
      return { token, user };
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Login failed. Check your credentials."));
    }
  },
);

export const signupUser = createAsyncThunk(
  "auth/signupUser",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await signup(payload);
      const token = data?.access_token ?? null;
      const user = data?.user ?? null;
      if (!token || !user) {
        return rejectWithValue("Sign up failed. Missing auth payload.");
      }
      persistAuth(token, user);
      return { token, user };
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Sign up failed. Try a different email."));
    }
  },
);

export const ownerSignupUser = createAsyncThunk(
  "auth/ownerSignupUser",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await ownerSignup(payload);
      const token = data?.access_token ?? null;
      const user = data?.user ?? null;
      if (!token || !user) {
        return rejectWithValue("Owner sign up failed. Missing auth payload.");
      }
      persistAuth(token, user);
      return { token, user };
    } catch (err) {
      return rejectWithValue(normalizeError(err, "Owner sign up failed. Try a different email."));
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  clearPersistedAuth();
  return true;
});

const initialToken = getToken();
const initialUser = readStoredUser();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: initialUser,
    token: initialToken,
    isAuthenticated: Boolean(initialToken && initialUser),
    loading: Boolean(initialToken),
    error: null,
  },
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = Boolean(action.payload.user && action.payload.token);
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(ownerSignupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(ownerSignupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(ownerSignupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
