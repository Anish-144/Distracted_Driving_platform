import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const initialState: AuthState = {
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

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
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', action.payload.token);
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    updateProfileType(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.profile_type = action.payload;
      }
    },
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
