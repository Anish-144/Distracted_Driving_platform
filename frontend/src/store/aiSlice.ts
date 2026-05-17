import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { BehaviorState } from '@/api/ai';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentType = 'passenger' | 'instructor' | 'authority' | null;

export interface AIMessage {
  agent: AgentType;
  text: string;
  audioUrl: string | null;   // revocable Object URL
  provider: string;
  timestamp: number;
}

interface AIState {
  /** Message currently displayed/playing */
  activeMessage: AIMessage | null;
  /** Is an LLM call in flight? */
  isLoading: boolean;
  /** Has TTS audio started playing? */
  isPlaying: boolean;
  /** Latest behavioral state from backend */
  behavior: BehaviorState | null;
  /** Is the AI layer enabled? (user can toggle off) */
  enabled: boolean;
  /** Last error, if any */
  error: string | null;
}

const initialState: AIState = {
  activeMessage: null,
  isLoading: false,
  isPlaying: false,
  behavior: null,
  enabled: true,
  error: null,
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    aiRequestStarted(state) {
      state.isLoading = true;
      state.error = null;
    },

    aiMessageReceived(
      state,
      action: PayloadAction<{
        agent: AgentType;
        text: string;
        audioUrl: string | null;
        provider: string;
      }>
    ) {
      // Revoke old URL to prevent memory leaks
      if (state.activeMessage?.audioUrl) {
        try { URL.revokeObjectURL(state.activeMessage.audioUrl); } catch {}
      }
      state.activeMessage = {
        ...action.payload,
        timestamp: Date.now(),
      };
      state.isLoading = false;
      state.isPlaying = false;
    },

    behaviorUpdated(state, action: PayloadAction<BehaviorState>) {
      state.behavior = action.payload;
    },

    audioStarted(state) {
      state.isPlaying = true;
    },

    audioEnded(state) {
      state.isPlaying = false;
    },

    aiCleared(state) {
      if (state.activeMessage?.audioUrl) {
        try { URL.revokeObjectURL(state.activeMessage.audioUrl); } catch {}
      }
      state.activeMessage = null;
      state.isLoading = false;
      state.isPlaying = false;
      state.error = null;
    },

    aiError(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    aiToggled(state) {
      state.enabled = !state.enabled;
      if (!state.enabled) {
        // Clean up when disabled
        if (state.activeMessage?.audioUrl) {
          try { URL.revokeObjectURL(state.activeMessage.audioUrl); } catch {}
        }
        state.activeMessage = null;
        state.isLoading = false;
        state.isPlaying = false;
      }
    },
  },
});

export const {
  aiRequestStarted,
  aiMessageReceived,
  behaviorUpdated,
  audioStarted,
  audioEnded,
  aiCleared,
  aiError,
  aiToggled,
} = aiSlice.actions;

export default aiSlice.reducer;
