import {Q} from '@nozbe/watermelondb';
import {database} from '../db';
import {PriceList} from '../db/models/PriceList';
import {PriceListLine} from '../db/models/PriceListLine';

export async function resolveUnitPrice(input: {
  priceListId?: string | null;
  productId?: string;
  variantId?: string;
  fallback: number;
}): Promise<number> {
  if (!input.priceListId || !input.productId) {
    return input.fallback;
  }
  try {
    const list = await database.get<PriceList>('price_lists').find(input.priceListId);
    if (list.deletedAt) {
      return input.fallback;
    }
    const now = Date.now();
    if (list.validFrom && new Date(list.validFrom).getTime() > now) {
      return input.fallback;
    }
    if (list.validTo && new Date(list.validTo).getTime() < now) {
      return input.fallback;
    }
    const lines = database.get<PriceListLine>('price_list_lines');
    let row: PriceListLine | undefined;
    if (input.variantId) {
      const byVariant = await lines
        .query(
          Q.where('price_list_id', input.priceListId),
          Q.where('product_id', input.productId),
          Q.where('variant_id', input.variantId),
        )
        .fetch();
      row = byVariant[0];
    }
    if (!row) {
      const byProduct = await lines
        .query(
          Q.where('price_list_id', input.priceListId),
          Q.where('product_id', input.productId),
        )
        .fetch();
      row = byProduct.find(l => !l.variantId) ?? byProduct[0];
    }
    let price = row?.unitPrice ?? input.fallback;
    if (list.discountPct && list.discountPct > 0) {
      price = price * (1 - list.discountPct / 100);
    }
    return Math.round(price * 100) / 100;
  } catch {
    return input.fallback;
  }
}
