import {
  expirySeverity,
  needsReorder,
  pickFefoBatch,
  purchaseQtyToSaleUnits,
  saleUnitsToPurchaseQty,
} from '../src/inventory/inventoryMath';

describe('inventoryMath', () => {
  it('converts purchase qty to sale units', () => {
    expect(purchaseQtyToSaleUnits(2, 12)).toBe(24);
    expect(saleUnitsToPurchaseQty(24, 12)).toBe(2);
  });

  it('picks FEFO batch', () => {
    const pick = pickFefoBatch(
      [
        {batchNumber: 'B2', qty: 5, expiryDate: '2026-06-01'},
        {batchNumber: 'B1', qty: 5, expiryDate: '2026-03-01'},
      ],
      2,
    );
    expect(pick?.batch.batchNumber).toBe('B1');
  });

  it('classifies expiry severity', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    expect(expirySeverity(soon.toISOString().slice(0, 10))).toBe('red');

    const month = new Date();
    month.setDate(month.getDate() + 20);
    expect(expirySeverity(month.toISOString().slice(0, 10))).toBe('amber');
  });

  it('detects reorder need', () => {
    expect(needsReorder(5, 10)).toBe(true);
    expect(needsReorder(15, 10)).toBe(false);
  });
});
