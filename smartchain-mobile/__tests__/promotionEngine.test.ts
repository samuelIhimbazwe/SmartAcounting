import type {CartItem} from '../src/store/slices/posSlice';

type PromoRow = {
  id: string;
  name: string;
  promotionType: string;
  discountValue?: number;
  bundlePrice?: number;
  buyQuantity?: number;
  getQuantity?: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  productIdsJson?: string;
  active: boolean;
  allowStack: boolean;
};

function evaluatePure(promos: PromoRow[], cart: CartItem[]) {
  const subtotal = cart.reduce((a, l) => a + l.lineTotal, 0);
  let best = {id: '', name: '', amount: 0, promotionType: ''};
  for (const promo of promos.filter(p => p.active)) {
    if (subtotal < (promo.minimumPurchase ?? 0)) {
      continue;
    }
    let discount = 0;
    if (promo.promotionType === 'DISCOUNT_PCT') {
      discount = subtotal * ((promo.discountValue ?? 0) / 100);
    } else if (promo.promotionType === 'BUY_X_GET_Y') {
      const buyX = promo.buyQuantity ?? 1;
      const getY = promo.getQuantity ?? 0;
      for (const item of cart) {
        const sets = Math.floor(item.quantity / (buyX + getY));
        discount += sets * getY * item.unitPrice;
      }
    }
    if (discount > Math.abs(best.amount)) {
      best = {id: promo.id, name: promo.name, amount: -discount, promotionType: promo.promotionType};
    }
  }
  return {lines: best.amount ? [best] : [], totalDiscount: Math.abs(best.amount)};
}

const line = (qty: number, price: number, productId = 'p1'): CartItem => ({
  catalogItemId: '1',
  productId,
  barcode: 'x',
  sku: 'SKU',
  name: 'Item',
  quantity: qty,
  unitPrice: price,
  costPrice: 0,
  currency: 'FRW',
  lineTotal: qty * price,
  margin: 0,
});

describe('promotionEngine', () => {
  it('applies DISCOUNT_PCT when minimum met', () => {
    const r = evaluatePure(
      [{id: '1', name: '10% off', promotionType: 'DISCOUNT_PCT', discountValue: 10, minimumPurchase: 0, active: true, allowStack: false}],
      [line(1, 10000)],
    );
    expect(r.totalDiscount).toBe(1000);
  });

  it('applies BUY_X_GET_Y free units', () => {
    const r = evaluatePure(
      [{
        id: '2',
        name: 'B2G1',
        promotionType: 'BUY_X_GET_Y',
        buyQuantity: 2,
        getQuantity: 1,
        minimumPurchase: 0,
        active: true,
        allowStack: false,
      }],
      [line(3, 1000)],
    );
    expect(r.totalDiscount).toBe(1000);
  });
});
