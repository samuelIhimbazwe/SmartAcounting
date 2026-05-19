export interface BatchRow {
  batchNumber: string;
  qty: number;
  expiryDate?: string | null;
}

/** Convert purchase UOM qty to base sale units. */
export function purchaseQtyToSaleUnits(
  purchaseQty: number,
  conversionFactor: number,
): number {
  if (conversionFactor <= 0) {
    return purchaseQty;
  }
  return purchaseQty * conversionFactor;
}

/** Convert sale units to purchase UOM for display. */
export function saleUnitsToPurchaseQty(
  saleQty: number,
  conversionFactor: number,
): number {
  if (conversionFactor <= 0) {
    return saleQty;
  }
  return saleQty / conversionFactor;
}

/** First-expiry-first-out batch pick. */
export function pickFefoBatch(
  batches: BatchRow[],
  qtyNeeded: number,
): {batch: BatchRow; qty: number} | null {
  const available = batches
    .filter(b => b.qty > 0)
    .sort((a, b) => {
      const ea = a.expiryDate ?? '9999-12-31';
      const eb = b.expiryDate ?? '9999-12-31';
      return ea.localeCompare(eb);
    });
  for (const batch of available) {
    if (batch.qty >= qtyNeeded) {
      return {batch, qty: qtyNeeded};
    }
  }
  return available[0] ? {batch: available[0], qty: Math.min(available[0].qty, qtyNeeded)} : null;
}

export type ExpirySeverity = 'none' | 'amber' | 'red';

export function expirySeverity(
  expiryDate: string | null | undefined,
  now = new Date(),
): ExpirySeverity {
  if (!expiryDate) {
    return 'none';
  }
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) {
    return 'none';
  }
  const ms = exp.getTime() - now.getTime();
  const days = ms / (24 * 60 * 60 * 1000);
  if (days < 0) {
    return 'red';
  }
  if (days <= 7) {
    return 'red';
  }
  if (days <= 30) {
    return 'amber';
  }
  return 'none';
}

export function needsReorder(stockQty: number, reorderPoint: number): boolean {
  return reorderPoint > 0 && stockQty <= reorderPoint;
}
