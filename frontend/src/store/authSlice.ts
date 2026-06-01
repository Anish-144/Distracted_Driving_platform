import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { updateCoreProfile, UpdateCoreProfilePayload } from '@/api/auth';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  profile_type: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ─── Rehydrate auth state from localStorage on startup ────────────────────────
// When a user refreshes the page, Redux resets to default state. We restore the
// token AND the user object from localStorage so they remain logged in.
function loadPersistedAuth(): Pick<AuthState, 'user' | 'token' | 'isAuthenticated'> {
  if (typeof window === 'undefined') {
    return { user: null, token: null, isAuthenticated: false };
  }
  try {
    const token = localStorage.getItem('access_token');
    const userJson = localStorage.getItem('auth_user');
    if (token && userJson) {
      const user: AuthUser = JSON.parse(userJson);
      return { user, token, isAuthenticated: true };
    }
  } catch {
    // Corrupted localStorage — clear and start fresh
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');
  }
  return { user: null, token: null, isAuthenticated: false };
}

const persisted = loadPersistedAuth();

const initialState: AuthState = {
  user: persisted.user,
  token: persisted.token,
  isAuthenticated: persisted.isAuthenticated,
  isLoading: false,
  error: null,
};

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload: UpdateCoreProfilePayload, { rejectWithValue }) => {
    try {
      return await updateCoreProfile(payload);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    loginSuccess(
      state,
      action: PayloadAction<{ user: AuthUser; token: string }>
    ) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      // Persist both token and user to localStorage for page-refresh rehydration
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', action.payload.token);
        localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
      }
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      // Keep localStorage in sync
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_user', JSON.stringify(action.payload));
      }
    },
    updateProfileType(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.profile_type = action.payload;
        // Keep localStorage in sync
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(state.user));
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      if (state.user) {
        state.user.name = action.payload.name;
        state.user.email = action.payload.email;
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(state.user));
        }
      }
    });
  },
});

export const {
  setLoading,
  loginSuccess,
  logout,
  setError,
  setUser,
  updateProfileType,
} = authSlice.actions;

export default authSlice.reducer;
