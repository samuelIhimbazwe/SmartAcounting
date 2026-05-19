import {fetchBalances, fetchBatches, fetchExpiryRisk} from '../api/inventory';
import {upsertProductFromBalance} from './inventoryRepository';
import {getSyncLocationCode} from './syncLocation';
import {database} from '../db';
import {VariantBatch} from '../db/models/VariantBatch';
import {ProductVariant} from '../db/models/ProductVariant';
import {Q} from '@nozbe/watermelondb';

export async function syncCatalogFromBalances(
  locationCode?: string,
): Promise<void> {
  const loc = locationCode ?? getSyncLocationCode();
  const rows = await fetchBalances(loc);
  for (const row of rows) {
    await upsertProductFromBalance(row);
  }
}

export async function syncBatchesFromApi(locationCode?: string): Promise<void> {
  const loc = locationCode ?? getSyncLocationCode();
  const rows = await fetchBatches(loc);
  const ops: Array<() => Promise<void>> = [];

  for (const row of rows) {
    const sku = String(row.sku ?? row.productSku ?? '');
    const batchNumber = String(row.lotCode ?? row.batchNumber ?? '');
    if (!sku || !batchNumber) {
      continue;
    }
    const variants = await database
      .get<ProductVariant>('product_variants')
      .query(Q.where('sku', sku))
      .fetch();
    const variant = variants[0];
    if (!variant) {
      continue;
    }
    const qty = Number(row.quantityOnHand ?? row.qty ?? 0);
    const expiry = row.expiryDate as string | undefined;
    const existing = await database
      .get<VariantBatch>('variant_batches')
      .query(
        Q.where('variant_id', variant.id),
        Q.where('batch_number', batchNumber),
      )
      .fetch();

    ops.push(async () => {
      if (existing[0]) {
        await existing[0].update(b => {
          b.qty = qty;
          b.expiryDate = expiry;
        });
      } else {
        await database.get<VariantBatch>('variant_batches').create(b => {
          b.variantId = variant.id;
          b.productId = variant.productId;
          b.batchNumber = batchNumber;
          b.qty = qty;
          b.expiryDate = expiry;
        });
      }
    });
  }

  if (ops.length > 0) {
    await database.write(async () => {
      for (const op of ops) {
        await op();
      }
    });
  }
}

export async function fetchExpiringItems(daysAhead = 30, locationCode?: string) {
  const loc = locationCode ?? getSyncLocationCode();
  try {
    return await fetchExpiryRisk(daysAhead, loc);
  } catch {
    const batches = await database.get<VariantBatch>('variant_batches').query().fetch();
    const now = Date.now();
    const horizon = now + daysAhead * 24 * 60 * 60 * 1000;
    return batches
      .filter(b => {
        if (!b.expiryDate) {
          return false;
        }
        const t = new Date(b.expiryDate).getTime();
        return t <= horizon;
      })
      .map(b => ({
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        qty: b.qty,
        variantId: b.variantId,
      }));
  }
}

/** Sync local catalog from API for the active branch (`selectedLocationCode`). */
export async function runInventorySync(locationCode?: string): Promise<void> {
  const loc = locationCode ?? getSyncLocationCode();
  try {
    await syncCatalogFromBalances(loc);
  } catch {
    /* offline */
  }
  try {
    await syncBatchesFromApi(loc);
  } catch {
    /* offline */
  }
}
