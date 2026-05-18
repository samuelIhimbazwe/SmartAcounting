import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface AlertItem {
  /** Discriminator from the SSE event, e.g. `ANOMALY_DETECTED`. */
  type: string;
  [k: string]: unknown;
}

interface AlertState {
  /** Most recent first; capped to keep state bounded. */
  items: AlertItem[];
  lastPushTitle: string | null;
  lastPushBody: string | null;
  lastReceivedAt: string | null;
}

const MAX_ITEMS = 200;

const initialState: AlertState = {
  items: [],
  lastPushTitle: null,
  lastPushBody: null,
  lastReceivedAt: null,
};

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    /**
     * Append a real-time alert received over SSE. Newest first; older items
     * are dropped beyond `MAX_ITEMS` so we never grow unbounded on long
     * sessions.
     */
    addAlert: (state, action: PayloadAction<AlertItem>) => {
      state.items.unshift(action.payload);
      if (state.items.length > MAX_ITEMS) {
        state.items.length = MAX_ITEMS;
      }
      state.lastReceivedAt = new Date().toISOString();
    },
    recordPush: (
      state,
      action: PayloadAction<{title?: string; body?: string}>,
    ) => {
      state.lastPushTitle = action.payload.title ?? null;
      state.lastPushBody = action.payload.body ?? null;
      state.lastReceivedAt = new Date().toISOString();
    },
    clearAlerts: state => {
      state.items = [];
      state.lastPushTitle = null;
      state.lastPushBody = null;
      state.lastReceivedAt = null;
    },
  },
});

export const {addAlert, recordPush, clearAlerts} = alertSlice.actions;
export default alertSlice.reducer;
