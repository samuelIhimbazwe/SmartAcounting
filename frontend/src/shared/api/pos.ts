import { apiClient } from './client'

export interface PosCatalogItemDto {
  catalogItemId: string
  barcode: string
  displayName: string
  unitPrice: string
  currencyCode: string
  sku?: string | null
  productId?: string | null
  reorderPoint?: string | null
}

export interface PosCheckoutLineDto {
  barcode: string
  quantity: string
}

export interface PosTenderDto {
  tenderType: 'CASH' | 'MOMO' | 'AIRTEL_MONEY' | 'CARD' | 'ON_ACCOUNT'
  amount: string
  reference?: string | null
}

export async function posScanBarcode(barcode: string): Promise<PosCatalogItemDto> {
  const { data } = await apiClient.get<PosCatalogItemDto>('/api/v1/pos/catalog/scan', {
    params: { barcode },
  })
  return data
}

export async function posCreateCatalogItem(payload: {
  barcode: string
  sku?: string
  displayName: string
  unitPrice: string
  currencyCode: string
  /** Inventory product UUID — stock is deducted from POS_DEFAULT_LOCATION on checkout */
  productId?: string
  /** Alert when on-hand ≤ this after a sale (optional) */
  reorderPoint?: string
}): Promise<{ catalogItemId: string }> {
  const { data } = await apiClient.post<{ catalogItemId: string }>('/api/v1/pos/catalog/items', payload)
  return data
}

export async function posCheckout(payload: {
  customerName?: string
  currencyCode: string
  posRegisterCode?: string
  lines: PosCheckoutLineDto[]
  tenders: PosTenderDto[]
  /** Required when ON_ACCOUNT tender amount &gt; 0 */
  onAccountCustomerName?: string
}): Promise<{ salesOrderId: string; totalAmount: string; currencyCode: string; receiptText: string; receiptHtml: string }> {
  const { data } = await apiClient.post('/api/v1/pos/checkout', payload)
  return data
}

export async function posReceipt(salesOrderId: string): Promise<{ text: string; html: string }> {
  const { data } = await apiClient.get<{ text: string; html: string }>(`/api/v1/pos/receipt/${salesOrderId}`)
  return data
}

export interface PosPrintedReceiptDto {
  transactionId: string
  printerType: 'thermal' | 'pdf' | 'sms-only'
  escPos: string
  reprint: boolean
  smsReceiptsSent: number
}

export async function posPrintReceipt(transactionId: string): Promise<PosPrintedReceiptDto> {
  const { data } = await apiClient.post<PosPrintedReceiptDto>('/api/v1/pos/receipts/print', { transactionId })
  return data
}

export async function posReprintReceipt(transactionId: string): Promise<PosPrintedReceiptDto> {
  const { data } = await apiClient.post<PosPrintedReceiptDto>(`/api/v1/pos/receipts/${transactionId}/reprint`)
  return data
}
