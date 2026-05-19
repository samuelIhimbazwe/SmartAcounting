import type {VariantAttributes} from '../db/models/ProductVariant';

export function parseAttributesJson(raw: string | undefined): VariantAttributes {
  if (!raw) {
    return {};
  }
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as VariantAttributes;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function stringifyAttributes(attrs: VariantAttributes): string {
  return JSON.stringify(attrs ?? {});
}

export function parseSerialsJson(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const v = JSON.parse(raw) as unknown;
    if (Array.isArray(v)) {
      return v.filter(s => typeof s === 'string');
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function variantDisplayLabel(
  name: string,
  attributes: VariantAttributes,
): string {
  const parts = Object.entries(attributes)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  if (parts.length === 0) {
    return name;
  }
  return `${name} (${parts.join(', ')})`;
}

export interface BalanceRow {
  productId?: string;
  sku?: string;
  productName?: string;
  name?: string;
  quantityOnHand?: number;
  qty?: number;
  unitPrice?: number;
  costPrice?: number;
  currencyCode?: string;
  reorderPoint?: number;
  barcode?: string;
}

export function mapBalanceRow(row: Record<string, unknown>): BalanceRow {
  return {
    productId: row.productId as string | undefined,
    sku: (row.sku ?? row.productSku) as string | undefined,
    productName: (row.productName ?? row.name) as string | undefined,
    name: row.name as string | undefined,
    quantityOnHand: Number(row.quantityOnHand ?? row.qty ?? 0),
    unitPrice: Number(row.unitPrice ?? row.sellingPrice ?? 0),
    costPrice: Number(row.costPrice ?? row.unitCost ?? 0),
    currencyCode: (row.currencyCode as string) ?? 'FRW',
    reorderPoint: Number(row.reorderPoint ?? 0),
    barcode: row.barcode as string | undefined,
  };
}
