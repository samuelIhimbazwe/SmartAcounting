import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {KpiDto} from '../../api/dashboard';

interface DashboardState {
  ownerKpis: KpiDto[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  ownerKpis: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    loadOwnerKpisPending: state => {
      state.loading = true;
      state.error = null;
    },
    loadOwnerKpisDone: (state, action: PayloadAction<KpiDto[]>) => {
      state.loading = false;
      state.ownerKpis = action.payload;
    },
    loadOwnerKpisFailed: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {loadOwnerKpisPending, loadOwnerKpisDone, loadOwnerKpisFailed} =
  dashboardSlice.actions;
export default dashboardSlice.reducer;
