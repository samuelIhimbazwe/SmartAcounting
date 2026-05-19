import {mapBalanceRow} from '../src/inventory/modelHelpers';

/** Sync mapping tests (no native SQLite in Jest). */
describe('inventory sync mapping', () => {
  it('maps balance rows for catalog upsert', () => {
    const rows = [
      {productId: 'uuid-1', sku: 'TEE-001', productName: 'Tee', quantityOnHand: 9},
      {productId: 'uuid-2', sku: 'TEE-002', productName: 'Tee M', qty: 4},
    ].map(mapBalanceRow);

    expect(rows[0].productId).toBe('uuid-1');
    expect(rows[1].quantityOnHand).toBe(4);
  });
});
