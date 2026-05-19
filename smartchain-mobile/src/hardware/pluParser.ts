/**
 * Variable-weight / price PLU barcode (EAN-13 style).
 * Layout: [prefix][5-digit PLU][5-digit value][check digit]
 */

export type PluValueMode = 'weight' | 'price';

export interface PluParseResult {
  pluCode: string;
  productLookupCode: string;
  quantity: number;
  embeddedValue: number;
  valueMode: PluValueMode;
  rawBarcode: string;
}

export interface PluParseOptions {
  prefixDigit: string;
  valueMode: PluValueMode;
}

function ean13CheckDigit(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits12[i]!, 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

function decodeEmbeddedValue(fiveDigits: string, mode: PluValueMode): number {
  const n = parseInt(fiveDigits, 10);
  if (Number.isNaN(n)) {
    return 0;
  }
  if (mode === 'weight') {
    return n / 1000;
  }
  return n / 100;
}

/**
 * Returns null if the barcode is not a PLU code for the configured prefix.
 */
export function parsePluBarcode(
  barcode: string,
  options: PluParseOptions,
): PluParseResult | null {
  const digits = barcode.replace(/\D/g, '');
  if (digits.length !== 13) {
    return null;
  }
  const prefix = options.prefixDigit.replace(/\D/g, '').slice(0, 1);
  if (!prefix || digits[0] !== prefix) {
    return null;
  }

  const body12 = digits.slice(0, 12);
  const expectedCheck = ean13CheckDigit(body12);
  const actualCheck = parseInt(digits[12]!, 10);
  if (expectedCheck !== actualCheck) {
    return null;
  }

  const pluCode = digits.slice(1, 6);
  const valueDigits = digits.slice(6, 11);
  const quantity = decodeEmbeddedValue(valueDigits, options.valueMode);
  if (quantity <= 0) {
    return null;
  }

  return {
    pluCode,
    productLookupCode: pluCode,
    quantity,
    embeddedValue: quantity,
    valueMode: options.valueMode,
    rawBarcode: digits,
  };
}

export function isPluBarcode(
  barcode: string,
  prefixDigit: string,
): boolean {
  return parsePluBarcode(barcode, {
    prefixDigit,
    valueMode: 'weight',
  }) !== null;
}
