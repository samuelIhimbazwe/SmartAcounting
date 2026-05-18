import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface InventoryState {
  balances: Record<string, unknown>[];
  lowStock: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  balances: [],
  lowStock: [],
  loading: false,
  error: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    loadBalancesPending: state => {
      state.loading = true;
      state.error = null;
    },
    loadBalancesDone: (
      state,
      action: PayloadAction<Record<string, unknown>[]>,
    ) => {
      state.loading = false;
      state.balances = action.payload;
    },
    loadBalancesFailed: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    loadLowStockDone: (
      state,
      action: PayloadAction<Record<string, unknown>[]>,
    ) => {
      state.lowStock = action.payload;
    },
  },
});

export const {
  loadBalancesPending,
  loadBalancesDone,
  loadBalancesFailed,
  loadLowStockDone,
} = inventorySlice.actions;
export default inventorySlice.reducer;
