import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type CopilotApproval = {
  approvalId: string;
  description: string;
  impactSummary?: string;
};

interface CopilotState {
  pendingApprovals: CopilotApproval[];
  badgeCount: number;
}

const initialState: CopilotState = {
  pendingApprovals: [],
  badgeCount: 0,
};

const copilotSlice = createSlice({
  name: 'copilot',
  initialState,
  reducers: {
    setPendingApprovals: (state, action: PayloadAction<CopilotApproval[]>) => {
      state.pendingApprovals = action.payload;
      state.badgeCount = action.payload.length;
    },
    addPendingApproval: (state, action: PayloadAction<CopilotApproval>) => {
      const exists = state.pendingApprovals.some(
        a => a.approvalId === action.payload.approvalId,
      );
      if (!exists) {
        state.pendingApprovals.unshift(action.payload);
        state.badgeCount = state.pendingApprovals.length;
      }
    },
    removePendingApproval: (state, action: PayloadAction<string>) => {
      state.pendingApprovals = state.pendingApprovals.filter(
        a => a.approvalId !== action.payload,
      );
      state.badgeCount = state.pendingApprovals.length;
    },
    clearPendingApprovals: state => {
      state.pendingApprovals = [];
      state.badgeCount = 0;
    },
  },
});

export const {
  setPendingApprovals,
  addPendingApproval,
  removePendingApproval,
  clearPendingApprovals,
} = copilotSlice.actions;
export default copilotSlice.reducer;
