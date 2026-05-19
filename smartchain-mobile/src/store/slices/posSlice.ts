import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {TenderLine, TenderType} from '../../utils/tenderValidation';

export interface CartItem {
  catalogItemId: string;
  barcode: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  currency: 'FRW' | 'USD';
  lineTotal: number;
  margin: number;
}

interface PosState {
  cart: CartItem[];
  sessionCurrency: 'FRW' | 'USD';
  discount: number;
  customerId: string | null;
  customerName: string | null;
  posRegisterCode: string;
  isProcessing: boolean;
  lastTransactionId: string | null;
  barcodeInput: string;
  openingFloat: number | null;
  shiftStartTime: string | null;
  cashierName: string | null;
  tenderLines: TenderLine[];
}

const initialState: PosState = {
  cart: [],
  sessionCurrency: 'FRW',
  discount: 0,
  customerId: null,
  customerName: null,
  posRegisterCode: 'REG1',
  isProcessing: false,
  lastTransactionId: null,
  barcodeInput: '',
  openingFloat: null,
  shiftStartTime: null,
  cashierName: null,
  tenderLines: [{tenderType: 'CASH', amount: 0}],
};

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existing = state.cart.find(
        i => i.catalogItemId === action.payload.catalogItemId,
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
        existing.lineTotal = existing.quantity * existing.unitPrice;
      } else {
        state.cart.push(action.payload);
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter(i => i.catalogItemId !== action.payload);
    },
    updateQuantity: (
      state,
      action: PayloadAction<{catalogItemId: string; quantity: number}>,
    ) => {
      const item = state.cart.find(
        i => i.catalogItemId === action.payload.catalogItemId,
      );
      if (item) {
        item.quantity = action.payload.quantity;
        item.lineTotal = item.quantity * item.unitPrice;
      }
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
    },
    setCustomer: (
      state,
      action: PayloadAction<{customerId: string; customerName: string} | null>,
    ) => {
      state.customerId = action.payload?.customerId ?? null;
      state.customerName = action.payload?.customerName ?? null;
    },
    setPosRegisterCode: (state, action: PayloadAction<string>) => {
      state.posRegisterCode = action.payload;
    },
    setSessionCurrency: (
      state,
      action: PayloadAction<'FRW' | 'USD'>,
    ) => {
      state.sessionCurrency = action.payload;
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setLastTransaction: (state, action: PayloadAction<string>) => {
      state.lastTransactionId = action.payload;
    },
    clearCart: state => {
      state.cart = [];
      state.discount = 0;
      state.customerId = null;
      state.customerName = null;
      state.isProcessing = false;
      state.barcodeInput = '';
      state.tenderLines = [{tenderType: 'CASH', amount: 0}];
    },
    setBarcodeInput: (state, action: PayloadAction<string>) => {
      state.barcodeInput = action.payload;
    },
    setTenderLines: (state, action: PayloadAction<TenderLine[]>) => {
      state.tenderLines = action.payload;
    },
    addTenderLine: (state, action: PayloadAction<TenderType>) => {
      state.tenderLines.push({tenderType: action.payload, amount: 0});
    },
    updateTenderLine: (
      state,
      action: PayloadAction<{index: number; amount: number}>,
    ) => {
      const line = state.tenderLines[action.payload.index];
      if (line) {
        line.amount = action.payload.amount;
      }
    },
    removeTenderLine: (state, action: PayloadAction<number>) => {
      if (state.tenderLines.length > 1) {
        state.tenderLines.splice(action.payload, 1);
      }
    },
    setTenderLineType: (
      state,
      action: PayloadAction<{index: number; tenderType: TenderType}>,
    ) => {
      const line = state.tenderLines[action.payload.index];
      if (line) {
        line.tenderType = action.payload.tenderType;
      }
    },
    setShiftContext: (
      state,
      action: PayloadAction<{
        posRegisterCode: string;
        openingFloat: number;
        shiftStartTime: string;
        cashierName: string;
      }>,
    ) => {
      state.posRegisterCode = action.payload.posRegisterCode;
      state.openingFloat = action.payload.openingFloat;
      state.shiftStartTime = action.payload.shiftStartTime;
      state.cashierName = action.payload.cashierName;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  setDiscount,
  setCustomer,
  setPosRegisterCode,
  setSessionCurrency,
  setProcessing,
  setLastTransaction,
  clearCart,
  setBarcodeInput,
  setShiftContext,
  setTenderLines,
  addTenderLine,
  updateTenderLine,
  removeTenderLine,
  setTenderLineType,
} = posSlice.actions;
export default posSlice.reducer;
