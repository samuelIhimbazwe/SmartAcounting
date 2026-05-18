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

export interface PurchaseOrderDetail extends PurchaseOrder {
  lines?: Array<{
    sku: string
    productName: string
    orderedQuantity: number
    unitCost: number
  }>
}

export async function listPurchaseOrders(status?: string, page = 0, size = 20) {
  const { data } = await apiClient.get<{ content: PurchaseOrder[] }>('/api/v1/procurement/purchase-orders', {
    params: { status, page, size },
  })
  return data.content ?? (data as unknown as PurchaseOrder[])
}

export async function getPurchaseOrder(poId: string) {
  const { data } = await apiClient.get<PurchaseOrderDetail>(`/api/v1/procurement/purchase-orders/${poId}`)
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
