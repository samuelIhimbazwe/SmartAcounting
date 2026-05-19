import {createSlice, PayloadAction} from '@reduxjs/toolkit';

type DismissedMap = Record<string, number>;

interface IntelligenceState {
  dismissedReorderUntil: DismissedMap;
  lastReorderFetchAt: string | null;
  reorderCount: number;
}

const initialState: IntelligenceState = {
  dismissedReorderUntil: {},
  lastReorderFetchAt: null,
  reorderCount: 0,
};

const intelligenceSlice = createSlice({
  name: 'intelligence',
  initialState,
  reducers: {
    setReorderCount: (state, action: PayloadAction<number>) => {
      state.reorderCount = action.payload;
      state.lastReorderFetchAt = new Date().toISOString();
    },
    dismissReorderSuggestion: (state, action: PayloadAction<string>) => {
      const until = Date.now() + 7 * 24 * 60 * 60 * 1000;
      state.dismissedReorderUntil[action.payload] = until;
    },
    pruneDismissed: state => {
      const now = Date.now();
      for (const [id, until] of Object.entries(state.dismissedReorderUntil)) {
        if (until <= now) {
          delete state.dismissedReorderUntil[id];
        }
      }
    },
  },
});

export const {
  setReorderCount,
  dismissReorderSuggestion,
  pruneDismissed,
} = intelligenceSlice.actions;
export default intelligenceSlice.reducer;
