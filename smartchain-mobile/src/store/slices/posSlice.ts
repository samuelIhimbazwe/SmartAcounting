import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {TenderLine, TenderType} from '../../utils/tenderValidation';

export interface CartItem {
  catalogItemId: string;
  productId?: string;
  variantId?: string;
  barcode: string;
  sku: string;
  name: string;
  variantLabel?: string;
  uomLabel?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  currency: 'FRW' | 'USD';
  lineTotal: number;
  margin: number;
  serialNumber?: string;
  batchNumber?: string;
  batchExpiry?: string;
  requiresSerial?: boolean;
}

export type SelectedCustomer = {
  customerId: string;
  serverId?: string;
  customerName: string;
  priceListId?: string;
  creditLimit: number;
  creditBalance: number;
  loyaltyPoints: number;
  loyaltyEnabled: boolean;
  taxExempt?: boolean;
};

export type PromotionDiscountLine = {
  id: string;
  name: string;
  amount: number;
};

interface PosState {
  cart: CartItem[];
  sessionCurrency: 'FRW' | 'USD';
  discount: number;
  promotionDiscount: number;
  promotionLines: PromotionDiscountLine[];
  loyaltyRedeemPoints: number;
  customerId: string | null;
  customerName: string | null;
  selectedCustomer: SelectedCustomer | null;
  posRegisterCode: string;
  isProcessing: boolean;
  lastTransactionId: string | null;
  lastReceiptLines: CartItem[];
  lastFiscalSignature: string | null;
  lastFiscalQrData: string | null;
  lastNetAmount: number;
  lastVatAmount: number;
  lastTaxExempt: boolean;
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
  promotionDiscount: 0,
  promotionLines: [],
  loyaltyRedeemPoints: 0,
  customerId: null,
  customerName: null,
  selectedCustomer: null,
  posRegisterCode: 'REG1',
  isProcessing: false,
  lastTransactionId: null,
  lastReceiptLines: [],
  lastFiscalSignature: null,
  lastFiscalQrData: null,
  lastNetAmount: 0,
  lastVatAmount: 0,
  lastTaxExempt: false,
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
      const key =
        action.payload.variantId ?? action.payload.catalogItemId;
      const existing = state.cart.find(
        i =>
          (i.variantId ?? i.catalogItemId) === key &&
          (action.payload.serialNumber
            ? i.serialNumber === action.payload.serialNumber
            : !i.serialNumber),
      );
      if (existing && !action.payload.serialNumber) {
        existing.quantity += action.payload.quantity;
        existing.lineTotal = existing.quantity * existing.unitPrice;
      } else {
        state.cart.push(action.payload);
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter(
        i => (i.variantId ?? i.catalogItemId) !== action.payload,
      );
    },
    updateQuantity: (
      state,
      action: PayloadAction<{catalogItemId: string; quantity: number}>,
    ) => {
      const item = state.cart.find(
        i =>
          i.catalogItemId === action.payload.catalogItemId ||
          i.variantId === action.payload.catalogItemId,
      );
      if (item) {
        item.quantity = action.payload.quantity;
        item.lineTotal = item.quantity * item.unitPrice;
      }
    },
    setCartLineSerial: (
      state,
      action: PayloadAction<{lineKey: string; serialNumber: string}>,
    ) => {
      const item = state.cart.find(
        i =>
          (i.variantId ?? i.catalogItemId) === action.payload.lineKey,
      );
      if (item) {
        item.serialNumber = action.payload.serialNumber;
      }
    },
    setCartLineBatch: (
      state,
      action: PayloadAction<{
        lineKey: string;
        batchNumber: string;
        batchExpiry?: string;
      }>,
    ) => {
      const item = state.cart.find(
        i =>
          (i.variantId ?? i.catalogItemId) === action.payload.lineKey,
      );
      if (item) {
        item.batchNumber = action.payload.batchNumber;
        item.batchExpiry = action.payload.batchExpiry;
      }
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
    },
    setCustomer: (state, action: PayloadAction<SelectedCustomer | null>) => {
      state.selectedCustomer = action.payload;
      state.customerId = action.payload?.customerId ?? null;
      state.customerName = action.payload?.customerName ?? null;
    },
    setPromotionResult: (
      state,
      action: PayloadAction<{
        lines: PromotionDiscountLine[];
        totalDiscount: number;
      }>,
    ) => {
      state.promotionLines = action.payload.lines;
      state.promotionDiscount = action.payload.totalDiscount;
    },
    setLoyaltyRedeemPoints: (state, action: PayloadAction<number>) => {
      state.loyaltyRedeemPoints = Math.max(0, action.payload);
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
    setLastReceiptLines: (state, action: PayloadAction<CartItem[]>) => {
      state.lastReceiptLines = action.payload;
    },
    setLastFiscal: (
      state,
      action: PayloadAction<{
        fiscalSignature?: string | null;
        fiscalQrData?: string | null;
        netAmount?: number;
        vatAmount?: number;
        taxExempt?: boolean;
      }>,
    ) => {
      state.lastFiscalSignature = action.payload.fiscalSignature ?? null;
      state.lastFiscalQrData = action.payload.fiscalQrData ?? null;
      if (action.payload.netAmount != null) {
        state.lastNetAmount = action.payload.netAmount;
      }
      if (action.payload.vatAmount != null) {
        state.lastVatAmount = action.payload.vatAmount;
      }
      if (action.payload.taxExempt != null) {
        state.lastTaxExempt = action.payload.taxExempt;
      }
    },
    loadCartFromQuote: (
      state,
      action: PayloadAction<{
        cart: CartItem[];
        customer?: SelectedCustomer | null;
        currency?: 'FRW' | 'USD';
      }>,
    ) => {
      state.cart = action.payload.cart;
      state.discount = 0;
      state.promotionDiscount = 0;
      state.promotionLines = [];
      state.loyaltyRedeemPoints = 0;
      if (action.payload.currency) {
        state.sessionCurrency = action.payload.currency;
      }
      if (action.payload.customer !== undefined) {
        state.selectedCustomer = action.payload.customer;
        state.customerId = action.payload.customer?.customerId ?? null;
        state.customerName = action.payload.customer?.customerName ?? null;
      }
      state.tenderLines = [{tenderType: 'CASH', amount: 0}];
    },
    clearCart: state => {
      state.cart = [];
      state.discount = 0;
      state.promotionDiscount = 0;
      state.promotionLines = [];
      state.loyaltyRedeemPoints = 0;
      state.customerId = null;
      state.customerName = null;
      state.selectedCustomer = null;
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
  setCartLineSerial,
  setCartLineBatch,
  setDiscount,
  setCustomer,
  setPromotionResult,
  setLoyaltyRedeemPoints,
  setPosRegisterCode,
  setSessionCurrency,
  setProcessing,
  setLastTransaction,
  setLastReceiptLines,
  setLastFiscal,
  loadCartFromQuote,
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
