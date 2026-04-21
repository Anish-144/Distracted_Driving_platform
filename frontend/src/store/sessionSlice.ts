import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CurrentEvent {
  id: string;
  event_type: string;
  triggered_at: string;
  instruction_text?: string;
}

interface SessionState {
  sessionId: string | null;
  score: number;
  currentEvent: CurrentEvent | null;
  isSimulating: boolean;
  eventsCount: number;
  lastDecision: string | null;
  lastScoreDelta: number | null;
}

const initialState: SessionState = {
  sessionId: null,
  score: 100,
  currentEvent: null,
  isSimulating: false,
  eventsCount: 0,
  lastDecision: null,
  lastScoreDelta: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<{ sessionId: string; score: number }>) {
      state.sessionId = action.payload.sessionId;
      state.score = action.payload.score;
      state.isSimulating = true;
      state.eventsCount = 0;
      state.currentEvent = null;
      state.lastDecision = null;
      state.lastScoreDelta = null;
    },
    sessionEnded(state) {
      state.isSimulating = false;
      state.currentEvent = null;
    },
    sessionReset(state) {
      return initialState;
    },
    eventTriggered(state, action: PayloadAction<CurrentEvent>) {
      state.currentEvent = action.payload;
      state.eventsCount += 1;
    },
    eventResolved(
      state,
      action: PayloadAction<{ decision_type: string; score_delta: number; new_score: number }>
    ) {
      state.currentEvent = null;
      state.score = action.payload.new_score;
      state.lastDecision = action.payload.decision_type;
      state.lastScoreDelta = action.payload.score_delta;
    },
    scoreUpdated(state, action: PayloadAction<number>) {
      state.score = action.payload;
    },
    sessionRestored(state, action: PayloadAction<{ score: number; eventsCount: number }>) {
      state.score = action.payload.score;
      state.eventsCount = action.payload.eventsCount;
      state.isSimulating = true;
    },
  },
});

export const {
  sessionStarted,
  sessionEnded,
  sessionReset,
  eventTriggered,
  eventResolved,
  scoreUpdated,
  sessionRestored,
} = sessionSlice.actions;

export default sessionSlice.reducer;
