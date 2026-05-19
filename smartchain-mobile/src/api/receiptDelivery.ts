import {apiCall} from './client';
import type {CartItem} from '../store/slices/posSlice';
import {formatMoney} from '../utils/currency';

export function buildReceiptMessage(
  salesOrderId: string,
  lines: CartItem[],
  total: number,
  currency: 'FRW' | 'USD',
): string {
  const itemLines = lines
    .map(
      l =>
        `• ${l.name} x${l.quantity} — ${formatMoney(l.lineTotal, l.currency)}`,
    )
    .join('\n');
  return [
    'SmartChain Receipt',
    `Ref: ${salesOrderId}`,
    '',
    itemLines,
    '',
    `Total: ${formatMoney(total, currency)}`,
    'Thank you!',
  ].join('\n');
}

export async function deliverReceipt(body: {
  salesOrderId: string;
  phone: string;
  channel: 'WHATSAPP' | 'SMS';
  message: string;
}): Promise<{ok: boolean; message?: string}> {
  return apiCall('/pos/receipts/' + body.salesOrderId + '/deliver', {
    method: 'POST',
    body: JSON.stringify({
      phone: body.phone,
      channel: body.channel,
      message: body.message,
    }),
  });
}
