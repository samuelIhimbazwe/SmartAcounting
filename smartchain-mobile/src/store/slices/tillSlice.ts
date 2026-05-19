import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface TillState {
  currentSessionId: string | null;
  businessDate: string;
  posRegisterCode: string;
  countedCash: string;
  countedMomo: string;
  countedAirtel: string;
  countedCard: string;
  countedOnAccount: string;
  notes: string;
  tillExpectedSnapshot: Record<string, unknown> | null;
}

const today = () => new Date().toISOString().slice(0, 10);

const initialState: TillState = {
  currentSessionId: null,
  businessDate: today(),
  posRegisterCode: 'REG1',
  countedCash: '0',
  countedMomo: '0',
  countedAirtel: '0',
  countedCard: '0',
  countedOnAccount: '0',
  notes: '',
  tillExpectedSnapshot: null,
};

const tillSlice = createSlice({
  name: 'till',
  initialState,
  reducers: {
    setCurrentSessionId: (state, action: PayloadAction<string | null>) => {
      state.currentSessionId = action.payload;
    },
    setTillBusinessDate: (state, action: PayloadAction<string>) => {
      state.businessDate = action.payload;
    },
    setTillRegisterCode: (state, action: PayloadAction<string>) => {
      state.posRegisterCode = action.payload;
    },
    setTillCounts: (
      state,
      action: PayloadAction<
        Partial<{
          countedCash: string;
          countedMomo: string;
          countedAirtel: string;
          countedCard: string;
          countedOnAccount: string;
        }>
      >,
    ) => {
      Object.assign(state, action.payload);
    },
    setTillNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    },
    setTillExpectedSnapshot: (
      state,
      action: PayloadAction<Record<string, unknown> | null>,
    ) => {
      state.tillExpectedSnapshot = action.payload;
    },
    clearTillSession: state => {
      state.currentSessionId = null;
    },
    resetTillForm: state => {
      state.currentSessionId = null;
      state.businessDate = today();
      state.countedCash = '0';
      state.countedMomo = '0';
      state.countedAirtel = '0';
      state.countedCard = '0';
      state.countedOnAccount = '0';
      state.notes = '';
      state.tillExpectedSnapshot = null;
    },
  },
});

export const {
  setCurrentSessionId,
  clearTillSession,
  setTillBusinessDate,
  setTillRegisterCode,
  setTillCounts,
  setTillNotes,
  setTillExpectedSnapshot,
  resetTillForm,
} = tillSlice.actions;
export default tillSlice.reducer;
