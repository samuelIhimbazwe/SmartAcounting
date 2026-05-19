import type {CartItem} from '../store/slices/posSlice';

const CUT_MARK = '\x1D' + 'V' + '\x42' + '\x03';

export function appendReceiptLineExtras(
  escpos: string,
  cartLines: CartItem[],
): string {
  if (cartLines.length === 0) {
    return escpos;
  }
  const cutIdx = escpos.lastIndexOf(CUT_MARK);
  const head = cutIdx >= 0 ? escpos.slice(0, cutIdx) : escpos;
  const tail = cutIdx >= 0 ? escpos.slice(cutIdx) : '\n\n\n' + CUT_MARK;
  const extras: string[] = [];
  for (const line of cartLines) {
    if (line.variantLabel) {
      extras.push(`  ${line.variantLabel}`);
    }
    if (line.batchNumber) {
      extras.push(`  Lot: ${line.batchNumber}`);
    }
    if (line.serialNumber) {
      extras.push(`  SN: ${line.serialNumber}`);
    }
  }
  if (extras.length === 0) {
    return escpos;
  }
  return `${head}\n${extras.join('\n')}\n${tail}`;
}
