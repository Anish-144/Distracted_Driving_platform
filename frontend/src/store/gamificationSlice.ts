import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getMyGamification, dailyCheckin, getFriends, getXPLeaderboard,
  GamificationData, FriendData, LeaderboardEntry, DailyCheckinResult,
} from '@/api/gamification';

interface GamificationState {
  data: GamificationData | null;
  friends: FriendData[];
  leaderboard: LeaderboardEntry[];
  currentUserRank: number | null;
  isLoading: boolean;
  error: string | null;
  // Level-up animation trigger
  levelUpEvent: { oldLevel: number; newLevel: number; rank: string } | null;
  // Achievement unlock animation queue
  newlyUnlockedKeys: string[];
  // Last check-in result
  lastCheckin: DailyCheckinResult | null;
}

const initialState: GamificationState = {
  data: null,
  friends: [],
  leaderboard: [],
  currentUserRank: null,
  isLoading: false,
  error: null,
  levelUpEvent: null,
  newlyUnlockedKeys: [],
  lastCheckin: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchGamificationData = createAsyncThunk(
  'gamification/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      return await getMyGamification();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to load gamification data');
    }
  }
);

export const performDailyCheckin = createAsyncThunk(
  'gamification/dailyCheckin',
  async (_, { rejectWithValue }) => {
    try {
      return await dailyCheckin();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Check-in failed');
    }
  }
);

export const fetchFriends = createAsyncThunk(
  'gamification/fetchFriends',
  async (_, { rejectWithValue }) => {
    try {
      return await getFriends();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to load friends');
    }
  }
);

export const fetchXPLeaderboard = createAsyncThunk(
  'gamification/fetchLeaderboard',
  async (_, { rejectWithValue }) => {
    try {
      return await getXPLeaderboard();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to load leaderboard');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    clearLevelUpEvent: (state) => {
      state.levelUpEvent = null;
    },
    clearUnlockedKeys: (state) => {
      state.newlyUnlockedKeys = [];
    },
    clearLastCheckin: (state) => {
      state.lastCheckin = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchGamificationData
      .addCase(fetchGamificationData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGamificationData.fulfilled, (state, action) => {
        state.isLoading = false;
        const prev = state.data;
        state.data = action.payload;
        // Detect level-up by comparing with previous data
        if (prev && action.payload.level > prev.level) {
          state.levelUpEvent = {
            oldLevel: prev.level,
            newLevel: action.payload.level,
            rank: action.payload.driver_rank,
          };
        }
        // Detect newly unlocked achievements
        if (prev) {
          const prevUnlocked = new Set(prev.achievements.filter(a => a.unlocked).map(a => a.key));
          const newKeys = action.payload.achievements
            .filter(a => a.unlocked && !prevUnlocked.has(a.key))
            .map(a => a.key);
          if (newKeys.length > 0) {
            state.newlyUnlockedKeys = newKeys;
          }
        }
      })
      .addCase(fetchGamificationData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // performDailyCheckin
      .addCase(performDailyCheckin.fulfilled, (state, action) => {
        state.lastCheckin = action.payload;
        if (state.data) {
          state.data.current_streak = action.payload.current_streak;
          state.data.xp += action.payload.xp_awarded;
        }
      })
      // fetchFriends
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.friends = action.payload;
      })
      // fetchXPLeaderboard
      .addCase(fetchXPLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload.entries;
        state.currentUserRank = action.payload.current_user_rank;
      });
  },
});

export const { clearLevelUpEvent, clearUnlockedKeys, clearLastCheckin } = gamificationSlice.actions;
export default gamificationSlice.reducer;
