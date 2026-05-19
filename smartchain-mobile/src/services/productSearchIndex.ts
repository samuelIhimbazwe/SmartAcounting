import Fuse from 'fuse.js';
import {listProducts, getProductWithVariants} from '../inventory/inventoryRepository';
import type {Product} from '../db/models/Product';

export type CatalogSearchHit = {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  barcode: string;
};

let fuse: Fuse<CatalogSearchHit> | null = null;
let building: Promise<void> | null = null;

const PAGE_SIZE = 20;

export async function rebuildProductSearchIndex(): Promise<void> {
  if (building) {
    return building;
  }
  building = (async () => {
    const products = await listProducts();
    const hits: CatalogSearchHit[] = [];
    for (const p of products) {
      const {variants} = await getProductWithVariants(p.id);
      if (variants.length === 0) {
        hits.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.sku,
        });
      } else {
        for (const v of variants) {
          hits.push({
            productId: p.id,
            variantId: v.id,
            name: `${p.name} ${v.name ?? ''}`.trim(),
            sku: v.sku,
            barcode: v.barcode ?? v.sku,
          });
        }
      }
    }
    fuse = new Fuse(hits, {
      keys: ['name', 'sku', 'barcode'],
      threshold: 0.35,
      ignoreLocation: true,
    });
    building = null;
  })();
  return building;
}

export async function searchCatalogLocal(
  query: string,
  page = 0,
): Promise<CatalogSearchHit[]> {
  const q = query.trim();
  if (!q) {
    return [];
  }
  if (!fuse) {
    await rebuildProductSearchIndex();
  }
  const all = fuse?.search(q, {limit: 500}).map(r => r.item) ?? [];
  const start = page * PAGE_SIZE;
  return all.slice(start, start + PAGE_SIZE);
}
