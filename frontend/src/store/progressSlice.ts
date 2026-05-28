import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getMyProgress, ProgressStats } from '@/api/progress';
import { getRecommendedLessons, getAllLessons, Lesson, getAIRecommendedLessons, AILesson, generateAILesson, completeAILesson, generateAILessonFromSession, retakeAILesson } from '@/api/lessons';
import { generateCognitiveReport } from '@/api/ai';

interface ProgressState {
  stats: ProgressStats | null;
  lessons: Lesson[];
  allLessons: Lesson[];
  aiLessons: AILesson[];
  isLoading: boolean;
  isGenerating: boolean;
  generateError: string | null;
  error: string | null;
}

const initialState: ProgressState = {
  stats: null,
  lessons: [],
  allLessons: [],
  aiLessons: [],
  isLoading: false,
  isGenerating: false,
  generateError: null,
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
  async (lessonId: string, { rejectWithValue }) => {
    try {
      const updated = await completeAILesson(lessonId);
      return updated;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to complete lesson');
    }
  }
);

export const retakeLesson = createAsyncThunk(
  'progress/retakeLesson',
  async (lessonId: string, { rejectWithValue }) => {
    try {
      const updated = await retakeAILesson(lessonId);
      return updated;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to retake lesson');
    }
  }
);

export const generateNewAILessonFromSession = createAsyncThunk(
  'progress/generateNewAILessonFromSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const lesson = await generateAILessonFromSession(sessionId);
      return lesson;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to generate session lesson');
    }
  }
);

export const generateSessionCognitiveReport = createAsyncThunk(
  'progress/generateSessionCognitiveReport',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      // Also generate the AI lesson quietly in the background so it shows up in Research tab
      generateAILessonFromSession(sessionId).catch(e => console.error("Silent AI lesson generation failed:", e));
      
      const report = await generateCognitiveReport(sessionId);
      return report;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to generate cognitive report');
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
      state.generateError = null;
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
        state.generateError = null;
      })
      .addCase(generateNewAILesson.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.generateError = null;
        state.aiLessons = [action.payload, ...state.aiLessons];
      })
      .addCase(generateNewAILesson.rejected, (state, action) => {
        state.isGenerating = false;
        state.generateError = (action.payload as string) || 'Generation failed. Please try again.';
      })
      // generateNewAILessonFromSession
      .addCase(generateNewAILessonFromSession.pending, (state) => {
        state.isGenerating = true;
        state.generateError = null;
      })
      .addCase(generateNewAILessonFromSession.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.generateError = null;
        state.aiLessons = [action.payload, ...state.aiLessons];
      })
      .addCase(generateNewAILessonFromSession.rejected, (state, action) => {
        state.isGenerating = false;
        state.generateError = (action.payload as string) || 'Generation failed. Please try again.';
      })
      // generateSessionCognitiveReport
      .addCase(generateSessionCognitiveReport.pending, (state) => {
        state.isGenerating = true;
        state.generateError = null;
      })
      .addCase(generateSessionCognitiveReport.fulfilled, (state) => {
        state.isGenerating = false;
        state.generateError = null;
      })
      .addCase(generateSessionCognitiveReport.rejected, (state, action) => {
        state.isGenerating = false;
        state.generateError = (action.payload as string) || 'Report generation failed. Please try again.';
      })
      // completeLesson
      .addCase(completeLesson.fulfilled, (state, action) => {
        const updated = action.payload;
        state.aiLessons = state.aiLessons.map(l =>
          l.id === updated.id ? updated : l
        );
        if (state.stats) {
          state.stats.timeline = state.stats.timeline || [];
          state.stats.total_sessions = (state.stats.total_sessions || 0) + 1;
        }
      })
      .addCase(retakeLesson.fulfilled, (state, action) => {
        const idx = state.aiLessons.findIndex(l => l.id === action.payload.id);
        if (idx !== -1) {
          state.aiLessons[idx] = action.payload;
        }
      });
  },
});

export const { clearProgress } = progressSlice.actions;
export default progressSlice.reducer;
