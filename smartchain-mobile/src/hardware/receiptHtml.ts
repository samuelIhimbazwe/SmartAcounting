import type {CartItem} from '../store/slices/posSlice';
import {formatMoney} from '../utils/currency';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface ReceiptHtmlInput {
  transactionId: string;
  lines: CartItem[];
  netAmount: number;
  vatAmount: number;
  taxExempt: boolean;
  currency: 'FRW' | 'USD';
  fiscalSignature?: string | null;
  storeName?: string;
}

export function buildReceiptHtml(input: ReceiptHtmlInput): string {
  const rows = input.lines
    .map(
      l =>
        `<tr><td>${escapeHtml(l.name)}</td><td align="right">${l.quantity} × ${formatMoney(l.unitPrice, input.currency)}</td><td align="right">${formatMoney(l.lineTotal, input.currency)}</td></tr>`,
    )
    .join('');
  const total = input.lines.reduce((a, b) => a + b.lineTotal, 0);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, sans-serif; font-size: 12px; max-width: 80mm; margin: 0 auto; }
  h1 { font-size: 16px; text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  .totals { margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }
  .mono { font-family: monospace; font-size: 10px; word-break: break-all; }
</style>
</head>
<body>
  <h1>${escapeHtml(input.storeName ?? 'SmartAccounting')}</h1>
  <p class="mono">${escapeHtml(input.transactionId)}</p>
  <table>${rows}</table>
  <div class="totals">
    <p>Subtotal (ex VAT): ${formatMoney(input.netAmount, input.currency)}</p>
    <p>VAT: ${input.taxExempt ? '0 (exempt)' : formatMoney(input.vatAmount, input.currency)}</p>
    <p><strong>Total: ${formatMoney(total, input.currency)}</strong></p>
    ${input.fiscalSignature ? `<p class="mono">Fiscal: ${escapeHtml(input.fiscalSignature)}</p>` : ''}
  </div>
  <p style="text-align:center;margin-top:12px;">Thank you</p>
</body>
</html>`;
}
