import posReducer, {
  addToCart,
  clearCart,
  setDiscount,
} from '../src/store/slices/posSlice';

const item = {
  catalogItemId: '1',
  barcode: '123',
  sku: 'SKU1',
  name: 'Item',
  quantity: 2,
  unitPrice: 1000,
  costPrice: 500,
  currency: 'FRW' as const,
  lineTotal: 2000,
  margin: 1000,
};

describe('posSlice checkout cart', () => {
  it('adds item and calculates line total', () => {
    const state = posReducer(undefined, addToCart(item));
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].lineTotal).toBe(2000);
  });

  it('applies discount and clears cart', () => {
    let state = posReducer(undefined, addToCart(item));
    state = posReducer(state, setDiscount(200));
    expect(state.discount).toBe(200);
    state = posReducer(state, clearCart());
    expect(state.cart).toHaveLength(0);
    expect(state.discount).toBe(0);
  });
});
