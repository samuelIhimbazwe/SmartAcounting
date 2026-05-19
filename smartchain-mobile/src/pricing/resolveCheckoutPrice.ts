import {resolveUnitPrice} from './pricingEngine';
import type {PriceListRef} from './priceListPick';

export type {PriceListRef} from './priceListPick';

/**
 * Resolution order: branch (location) list → customer list → global list → fallback.
 */
export async function resolveCheckoutUnitPrice(input: {
  locationId?: string | null;
  branchPriceListId?: string | null;
  customerPriceListId?: string | null;
  globalPriceListId?: string | null;
  productId?: string;
  variantId?: string;
  fallback: number;
}): Promise<number> {
  let price = input.fallback;
  if (input.branchPriceListId && input.productId) {
    price = await resolveUnitPrice({
      priceListId: input.branchPriceListId,
      productId: input.productId,
      variantId: input.variantId,
      fallback: price,
    });
  }
  if (input.customerPriceListId && input.productId) {
    price = await resolveUnitPrice({
      priceListId: input.customerPriceListId,
      productId: input.productId,
      variantId: input.variantId,
      fallback: price,
    });
  }
  if (input.globalPriceListId && input.productId) {
    price = await resolveUnitPrice({
      priceListId: input.globalPriceListId,
      productId: input.productId,
      variantId: input.variantId,
      fallback: price,
    });
  }
  return price;
}
