import {
  mapBalanceRow,
  parseAttributesJson,
  parseSerialsJson,
  stringifyAttributes,
  variantDisplayLabel,
} from '../src/inventory/modelHelpers';

describe('modelHelpers', () => {
  it('parses and stringifies variant attributes', () => {
    const attrs = {size: 'M', colour: 'blue'};
    expect(stringifyAttributes(attrs)).toBe(JSON.stringify(attrs));
    expect(parseAttributesJson(JSON.stringify(attrs))).toEqual(attrs);
  });

  it('parses serial list json', () => {
    expect(parseSerialsJson('["A","B"]')).toEqual(['A', 'B']);
    expect(parseSerialsJson('invalid')).toEqual([]);
  });

  it('builds variant display label', () => {
    expect(variantDisplayLabel('Shirt', {size: 'L'})).toContain('size: L');
  });

  it('maps balance API row', () => {
    const row = mapBalanceRow({
      productId: 'p1',
      sku: 'SKU1',
      productName: 'Widget',
      quantityOnHand: 12,
      reorderPoint: 3,
    });
    expect(row.sku).toBe('SKU1');
    expect(row.quantityOnHand).toBe(12);
    expect(row.reorderPoint).toBe(3);
  });
});
