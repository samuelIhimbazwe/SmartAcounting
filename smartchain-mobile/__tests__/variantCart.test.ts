jest.mock('../src/inventory/inventoryRepository', () => ({
  getSaleUomLabel: jest.fn(async () => 'unit'),
  pickCheckoutBatch: jest.fn(async () => null),
  variantLabel: (v: {name: string; attributes?: Record<string, string>}) =>
    v.attributes?.size ? `Size ${v.attributes.size}` : v.name,
}));

import {buildCartItemFromVariant} from '../src/inventory/variantCart';
import type {Product} from '../src/db/models/Product';
import type {ProductVariant} from '../src/db/models/ProductVariant';

describe('buildCartItemFromVariant', () => {
  const product = {
    id: 'p1',
    name: 'Shirt',
    sku: 'SHIRT',
    baseUnitPrice: 5000,
    currencyCode: 'FRW',
    isSerialTracked: true,
  } as Product;

  const variant = {
    id: 'v1',
    sku: 'SHIRT-M',
    barcode: '111',
    name: 'M',
    attributes: {size: 'M'},
    priceOverride: 5500,
    stockQty: 3,
  } as ProductVariant;

  it('maps variant price override and serial flag', () => {
    const item = buildCartItemFromVariant(product, variant, {
      serialNumber: 'IMEI-1',
    });
    expect(item.unitPrice).toBe(5500);
    expect(item.variantId).toBe('v1');
    expect(item.requiresSerial).toBe(true);
    expect(item.serialNumber).toBe('IMEI-1');
    expect(item.variantLabel).toContain('M');
  });
});
