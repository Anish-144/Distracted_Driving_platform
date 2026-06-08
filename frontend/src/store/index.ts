import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './authSlice';
import sessionReducer from './sessionSlice';
import progressReducer from './progressSlice';
import aiReducer from './aiSlice';
import settingsReducer from './settingsSlice';
import gamificationReducer from './gamificationSlice';

const appReducer = combineReducers({
  auth: authReducer,
  session: sessionReducer,
  progress: progressReducer,
  ai: aiReducer,
  settings: settingsReducer,
  gamification: gamificationReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/logout') {
    // Completely wipe redux state (all slices) on logout for security
    state = undefined;
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks — use these instead of raw useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
