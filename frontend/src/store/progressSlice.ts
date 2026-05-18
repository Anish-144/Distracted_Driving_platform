import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getMyProgress, ProgressStats } from '@/api/progress';
import { getRecommendedLessons, getAllLessons, Lesson, getAIRecommendedLessons, AILesson, generateAILesson, completeAILesson } from '@/api/lessons';

interface ProgressState {
  stats: ProgressStats | null;
  lessons: Lesson[];
  allLessons: Lesson[];
  aiLessons: AILesson[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

const initialState: ProgressState = {
  stats: null,
  lessons: [],
  allLessons: [],
  aiLessons: [],
  isLoading: false,
  isGenerating: false,
  error: null,
};

export const fetchProgressData = createAsyncThunk(
  'progress/fetchProgressData',
  async (_, { rejectWithValue }) => {
    try {
      const [stats, lessons, allLessons, aiLessons] = await Promise.all([
        getMyProgress(),
        getRecommendedLessons(),
        getAllLessons(),
        getAIRecommendedLessons(),
      ]);
      return { stats, lessons, allLessons, aiLessons };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch progress data');
    }
  }
);

export const generateNewAILesson = createAsyncThunk(
  'progress/generateNewAILesson',
  async (_, { rejectWithValue }) => {
    try {
      const lesson = await generateAILesson();
      return lesson;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to generate lesson');
    }
  }
);

export const completeLesson = createAsyncThunk(
  'progress/completeLesson',
  async ({ lessonId, score }: { lessonId: string; score?: number }, { rejectWithValue }) => {
    try {
      const updated = await completeAILesson(lessonId, score ?? 100);
      return updated;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to complete lesson');
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
      state.aiLessons = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchProgressData
      .addCase(fetchProgressData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProgressData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload.stats;
        state.lessons = action.payload.lessons;
        state.allLessons = action.payload.allLessons;
        state.aiLessons = action.payload.aiLessons;
      })
      .addCase(fetchProgressData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // generateNewAILesson
      .addCase(generateNewAILesson.pending, (state) => {
        state.isGenerating = true;
      })
      .addCase(generateNewAILesson.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.aiLessons = [action.payload, ...state.aiLessons];
      })
      .addCase(generateNewAILesson.rejected, (state) => {
        state.isGenerating = false;
      })
      // completeLesson
      .addCase(completeLesson.fulfilled, (state, action) => {
        const updated = action.payload;
        state.aiLessons = state.aiLessons.map(l =>
          l.id === updated.id ? updated : l
        );
      });
  },
});

export const { clearProgress } = progressSlice.actions;
export default progressSlice.reducer;
