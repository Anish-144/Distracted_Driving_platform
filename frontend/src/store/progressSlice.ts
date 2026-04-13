import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getMyProgress, ProgressStats } from '@/api/progress';
import { getRecommendedLessons, getAllLessons, Lesson } from '@/api/lessons';

interface ProgressState {
  stats: ProgressStats | null;
  lessons: Lesson[];
  allLessons: Lesson[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProgressState = {
  stats: null,
  lessons: [],
  allLessons: [],
  isLoading: false,
  error: null,
};

export const fetchProgressData = createAsyncThunk(
  'progress/fetchProgressData',
  async (_, { rejectWithValue }) => {
    try {
      const [stats, lessons, allLessons] = await Promise.all([
        getMyProgress(),
        getRecommendedLessons(),
        getAllLessons()
      ]);
      return { stats, lessons, allLessons };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch progress data');
    }
  }
);

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    clearProgress: (state) => {
      state.stats = null;
      state.lessons = [];
      state.allLessons = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProgressData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProgressData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload.stats;
        state.lessons = action.payload.lessons;
        state.allLessons = action.payload.allLessons;
      })
      .addCase(fetchProgressData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProgress } = progressSlice.actions;
export default progressSlice.reducer;
