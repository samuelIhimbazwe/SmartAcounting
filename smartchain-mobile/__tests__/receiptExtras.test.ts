import {appendReceiptLineExtras} from '../src/utils/receiptExtras';
import type {CartItem} from '../src/store/slices/posSlice';

const CUT = '\x1D' + 'V' + '\x42' + '\x03';

describe('appendReceiptLineExtras', () => {
  it('returns unchanged escpos when cart is empty', () => {
    const base = 'LINE1\n' + CUT;
    expect(appendReceiptLineExtras(base, [])).toBe(base);
  });

  it('appends variant, lot, and serial before cut', () => {
    const base = 'Item A  1000\n' + CUT;
    const lines: CartItem[] = [
      {
        catalogItemId: '1',
        name: 'Item A',
        barcode: 'x',
        sku: 'SKU',
        quantity: 1,
        unitPrice: 1000,
        costPrice: 0,
        currency: 'FRW',
        lineTotal: 1000,
        margin: 0,
        variantLabel: 'Size M',
        batchNumber: 'LOT-1',
        serialNumber: 'SN-99',
      },
    ];
    const out = appendReceiptLineExtras(base, lines);
    expect(out).toContain('Size M');
    expect(out).toContain('Lot: LOT-1');
    expect(out).toContain('SN: SN-99');
    expect(out.endsWith(CUT)).toBe(true);
  });
});
