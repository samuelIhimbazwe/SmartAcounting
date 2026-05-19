import type {CartItem} from '../store/slices/posSlice';
import type {CartVatSummary} from './vatEngine';
import type {TenderLine} from '../utils/tenderValidation';

export interface ReceiptConfig {
  businessName: string;
  businessTin: string;
  branchName: string;
  footerText: string;
  showVatBreakdown: boolean;
  paperWidthMm: 58 | 80;
  logoBase64?: string;
}

export interface FiscalReceiptData {
  salesOrderId: string;
  cashierName: string;
  registerCode: string;
  createdAt: string;
  cart: CartItem[];
  vat: CartVatSummary;
  discount: number;
  tenders: TenderLine[];
  changeGiven: number;
  fiscalSignature?: string;
  fiscalQrData?: string;
  taxExempt: boolean;
}

export function buildReceiptLines(
  data: FiscalReceiptData,
  config: ReceiptConfig,
): string[] {
  const lines: string[] = [];
  lines.push(config.businessName);
  lines.push(`TIN: ${config.businessTin}`);
  lines.push(`Branch: ${config.branchName}`);
  lines.push(`Register: ${data.registerCode}`);
  lines.push(`Cashier: ${data.cashierName}`);
  lines.push(data.createdAt);
  lines.push('--------------------------------');
  for (const item of data.cart) {
    lines.push(item.name);
    lines.push(
      `  ${item.quantity} x ${item.unitPrice} = ${item.lineTotal.toFixed(0)}`,
    );
  }
  lines.push('--------------------------------');
  if (config.showVatBreakdown) {
    lines.push(`Subtotal (ex VAT): ${data.vat.subtotalExVat.toFixed(0)}`);
    lines.push(
      data.taxExempt
        ? 'VAT: 0 (EXEMPT CUSTOMER)'
        : `VAT: ${data.vat.totalVat.toFixed(0)}`,
    );
  }
  if (data.discount > 0) {
    lines.push(`Discount: -${data.discount.toFixed(0)}`);
  }
  lines.push(`TOTAL: ${data.vat.totalInclVat.toFixed(0)}`);
  lines.push('Payments:');
  for (const t of data.tenders) {
    if (t.amount > 0) {
      lines.push(`  ${t.tenderType}: ${t.amount.toFixed(0)}`);
    }
  }
  if (data.changeGiven > 0) {
    lines.push(`Change: ${data.changeGiven.toFixed(0)}`);
  }
  if (data.fiscalSignature) {
    lines.push(`Fiscal: ${data.fiscalSignature}`);
  }
  lines.push('[RRA LOGO]');
  lines.push(config.footerText);
  lines.push('Thank you');
  return lines;
}
