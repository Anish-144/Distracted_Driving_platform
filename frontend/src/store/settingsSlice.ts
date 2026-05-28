import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchSettings, updateSettings as apiUpdateSettings, UserSettings, UserSettingsUpdate } from '@/api/settings';

interface SettingsState {
  data: UserSettings | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  data: null,
  isLoading: false,
  error: null,
};

export const loadSettings = createAsyncThunk(
  'settings/load',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchSettings();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to load settings');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (updates: UserSettingsUpdate, { rejectWithValue }) => {
    try {
      return await apiUpdateSettings(updates);
    } catch (error: any) {
      return rejectWithValue({
        error: error.response?.data?.detail || 'Failed to update settings',
        updates // pass back what failed for potential manual rollback if needed
      });
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Optimistic update
    optimisticUpdate: (state, action: PayloadAction<UserSettingsUpdate>) => {
      if (state.data) {
        state.data = { ...state.data, ...action.payload };
      }
    },
    // Rollback
    rollbackUpdate: (state, action: PayloadAction<UserSettingsUpdate>) => {
      // For a true rollback, we'd need the exact previous state. 
      // It's often simpler to just re-fetch, but if we pass it, we can revert here.
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // We don't change isLoading for updateSettings to keep it seamless, 
      // or we can if we want a global spinner. We'll let components handle local spinners.
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.data = action.payload; // confirm with server state
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.error = (action.payload as any)?.error as string;
      });
  },
});

export const { optimisticUpdate, rollbackUpdate } = settingsSlice.actions;
export default settingsSlice.reducer;
