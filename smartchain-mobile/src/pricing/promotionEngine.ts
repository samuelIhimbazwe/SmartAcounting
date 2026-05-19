import type {CartItem} from '../store/slices/posSlice';
import {database} from '../db';
import {PromotionCache} from '../db/models/PromotionCache';

export type PromotionLine = {
  id: string;
  name: string;
  amount: number;
  promotionType: string;
};

export type EvaluatedPromo = {
  lines: PromotionLine[];
  totalDiscount: number;
};

function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce((a, l) => a + l.lineTotal, 0);
}

export async function evaluatePromotions(cart: CartItem[]): Promise<EvaluatedPromo> {
  const promos = await database
    .get<PromotionCache>('promotions_cache')
    .query()
    .fetch();
  const active = promos.filter(p => p.active);
  const subtotal = cartSubtotal(cart);
  const lines: PromotionLine[] = [];
  const usedTypes = new Set<string>();

  for (const promo of active) {
    if (!promo.allowStack && usedTypes.has(promo.promotionType)) {
      continue;
    }
    const min = promo.minimumPurchase ?? 0;
    if (subtotal < min) {
      continue;
    }
    let discount = 0;
    const type = promo.promotionType;
    if (type === 'DISCOUNT_PCT' || type === 'PERCENTAGE_OFF') {
      const rate = (promo.discountValue ?? 0) / 100;
      discount = subtotal * rate;
    } else if (type === 'DISCOUNT_FIXED' || type === 'FIXED_AMOUNT_OFF') {
      discount = promo.discountValue ?? 0;
    } else if (type === 'BUY_X_GET_Y') {
      discount = bxgyDiscount(promo, cart);
    } else if (type === 'BUNDLE' || type === 'BUNDLE_PRICE') {
      discount = Math.max(0, subtotal - (promo.bundlePrice ?? subtotal));
    }
    if (promo.maximumDiscount && promo.maximumDiscount > 0) {
      discount = Math.min(discount, promo.maximumDiscount);
    }
    discount = Math.round(discount * 100) / 100;
    if (discount > 0) {
      lines.push({
        id: promo.id,
        name: promo.name,
        amount: -discount,
        promotionType: type,
      });
      usedTypes.add(type);
    }
  }

  const best = lines.length
    ? [lines.reduce((a, b) => (Math.abs(b.amount) > Math.abs(a.amount) ? b : a))]
    : [];

  const totalDiscount = best.reduce((a, l) => a + Math.abs(l.amount), 0);
  return {lines: best, totalDiscount};
}

function bxgyDiscount(promo: PromotionCache, cart: CartItem[]): number {
  const buyX = promo.buyQuantity ?? 1;
  const getY = promo.getQuantity ?? 0;
  if (getY <= 0) {
    return 0;
  }
  const productIds = promo.productIdsJson
    ? (JSON.parse(promo.productIdsJson) as string[])
    : [];
  let discount = 0;
  for (const item of cart) {
    if (productIds.length && item.productId && !productIds.includes(item.productId)) {
      continue;
    }
    const sets = Math.floor(item.quantity / (buyX + getY));
    if (sets > 0) {
      const unit = item.unitPrice;
      discount += unit * sets * getY;
    }
  }
  return discount;
}
