import {apiClient} from './client';

export interface PosCatalogScanRow {
  catalogItemId: string;
  barcode: string;
  displayName: string;
  unitPrice: number;
  currencyCode: string;
  sku: string;
  productId?: string;
  reorderPoint?: number;
}

export async function scanCatalog(barcode: string) {
  const {data} = await apiClient.get<PosCatalogScanRow>('/pos/catalog/scan', {
    params: {barcode},
  });
  return data;
}

export async function postCheckout(body: unknown) {
  const {data} = await apiClient.post<Record<string, unknown>>('/pos/checkout', body);
  return data;
}

export async function fetchReceipt(salesOrderId: string) {
  const {data} = await apiClient.get<Record<string, unknown>>(
    `/pos/receipt/${salesOrderId}`,
  );
  return data;
}

export async function printReceiptEscPos(transactionId: string) {
  const {data} = await apiClient.post<{
    escPos?: string;
    transactionId?: string;
  }>('/pos/receipts/print', {transactionId});
  return data;
}
