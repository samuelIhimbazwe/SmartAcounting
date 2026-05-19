import {parsePluBarcode} from '../src/hardware/pluParser';

/** Build valid EAN-13: prefix + 5 PLU + 5 value + filler (12 data digits) + check. */
function buildPlu13(plu: string, value: string, prefix = '2'): string {
  const body = `${prefix}${plu.padStart(5, '0')}${value.padStart(5, '0')}0`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(body[i]!, 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return body + String(check);
}

describe('pluParser', () => {
  it('extracts PLU code and weight in kg', () => {
    const barcode = buildPlu13('12345', '12340');
    const parsed = parsePluBarcode(barcode, {
      prefixDigit: '2',
      valueMode: 'weight',
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.pluCode).toBe('12345');
    expect(parsed!.quantity).toBeCloseTo(12.34, 2);
    expect(parsed!.valueMode).toBe('weight');
  });

  it('returns null for wrong prefix', () => {
    const barcode = buildPlu13('12345', '01234', '3');
    expect(
      parsePluBarcode(barcode, {prefixDigit: '2', valueMode: 'weight'}),
    ).toBeNull();
  });

  it('parses embedded price when mode is price', () => {
    const barcode = buildPlu13('99999', '01500');
    const parsed = parsePluBarcode(barcode, {
      prefixDigit: '2',
      valueMode: 'price',
    });
    expect(parsed!.quantity).toBeCloseTo(15, 2);
  });
});
