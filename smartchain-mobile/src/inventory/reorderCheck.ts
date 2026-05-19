import {listLowStockProducts} from './inventoryRepository';

export type ReorderAlert = {
  productId: string;
  productName: string;
  sku: string;
  stockQty: number;
  reorderPoint: number;
  reorderQty: number;
  preferredSupplierId?: string;
  variantId: string;
};

let cached: ReorderAlert[] = [];

export function getCachedReorderAlerts(): ReorderAlert[] {
  return cached;
}

export async function refreshReorderAlerts(): Promise<ReorderAlert[]> {
  const rows = await listLowStockProducts();
  cached = rows.map(({product, variant, totalQty}) => ({
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    stockQty: totalQty,
    reorderPoint: product.reorderPoint,
    reorderQty: product.reorderQty,
    preferredSupplierId: product.preferredSupplierId,
    variantId: variant.id,
  }));
  return cached;
}
