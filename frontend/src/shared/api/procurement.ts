import { apiClient } from './client'

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierName: string
  status: string
  totalAmount: number
  currencyCode: string
  orderDate?: string
  expectedDeliveryDate?: string
}

export interface PurchaseOrderDetailResponse {
  purchaseOrder: PurchaseOrder & { id: string }
  lines: Array<{
    id: string
    productId: string
    sku: string
    productName: string
    orderedQuantity: number
    receivedQuantity: number
    unitCost: number
    status: string
  }>
}

export interface GrnSummary {  id: string
  grnNumber: string
  receivedDate: string
  status: string
  notes?: string | null
}

export interface GrnLineRow {
  id: string
  sku: string
  productName: string
  expectedQuantity: number
  receivedQuantity: number
  unitCost: number
}

export async function listPurchaseOrders(status?: string, page = 0, size = 20) {
  const { data } = await apiClient.get<{ content: PurchaseOrder[] }>('/api/v1/procurement/purchase-orders', {
    params: { status, page, size },
  })
  return data.content ?? (data as unknown as PurchaseOrder[])
}

export async function getPurchaseOrder(poId: string) {
  const { data } = await apiClient.get<PurchaseOrderDetailResponse>(`/api/v1/procurement/purchase-orders/${poId}`)
  return data
}
export async function listPoGrns(poId: string): Promise<GrnSummary[]> {
  const { data } = await apiClient.get<GrnSummary[]>(`/api/v1/procurement/purchase-orders/${poId}/grns`)
  return data
}

export async function listGrnLines(grnId: string): Promise<GrnLineRow[]> {
  const { data } = await apiClient.get<GrnLineRow[]>(`/api/v1/procurement/purchase-orders/grn/${grnId}/lines`)
  return data
}

export async function createGrn(
  poId: string,
  body: {
    notes?: string
    receivedDate?: string
    lines: Array<{
      poLineId?: string
      productId: string
      sku: string
      productName: string
      expectedQuantity?: number
      receivedQuantity: number
      unitCost: number
    }>
  },
) {
  const { data } = await apiClient.post(`/api/v1/procurement/purchase-orders/${poId}/grn`, body)
  return data
}

export async function sendPurchaseOrder(poId: string, sentVia = 'email') {
  const { data } = await apiClient.post<PurchaseOrder>(`/api/v1/procurement/purchase-orders/${poId}/send`, {
    sentVia,
  })
  return data
}

export async function confirmPurchaseOrder(poId: string) {
  const { data } = await apiClient.post<PurchaseOrder>(`/api/v1/procurement/purchase-orders/${poId}/confirm`)
  return data
}

export async function confirmGrn(grnId: string) {
  const { data } = await apiClient.post(`/api/v1/procurement/purchase-orders/grn/${grnId}/confirm`)
  return data
}
