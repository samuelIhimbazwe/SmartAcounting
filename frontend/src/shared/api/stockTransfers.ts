import { apiClient } from './client'

export interface StockTransferLine {
  id?: string
  productId: string
  variantId?: string | null
  qty: number | string
}

export interface StockTransferRow {
  id: string
  fromLocationId: string
  toLocationId: string
  status: string
  createdBy?: string
  createdAt?: string
  receivedAt?: string | null
  lines: StockTransferLine[]
}

export interface CreateStockTransferPayload {
  fromLocationId?: string
  toLocationId: string
  lines: Array<{ productId: string; variantId?: string; qty: number }>
  requestOnly?: boolean
  notes?: string
}

export interface StockTransferListParams {
  status?: string
  locationId?: string
  productId?: string
}

export async function listStockTransfers(params?: StockTransferListParams): Promise<StockTransferRow[]> {
  const { data } = await apiClient.get<StockTransferRow[]>('/api/v1/stock/transfers', { params })
  return Array.isArray(data) ? data : []
}

export async function createStockTransfer(payload: CreateStockTransferPayload): Promise<StockTransferRow> {
  const { data } = await apiClient.post<StockTransferRow>('/api/v1/stock/transfers', {
    ...payload,
    requestOnly: payload.requestOnly ?? true,
  })
  return data
}

export async function approveStockTransfer(id: string, contextLocationId?: string): Promise<StockTransferRow> {
  const { data } = await apiClient.post<StockTransferRow>(
    `/api/v1/stock/transfers/${id}/approve`,
    undefined,
    { headers: contextLocationId ? { 'X-Location-Id': contextLocationId } : undefined },
  )
  return data
}

export async function dispatchStockTransfer(id: string, contextLocationId?: string): Promise<StockTransferRow> {
  const { data } = await apiClient.post<StockTransferRow>(
    `/api/v1/stock/transfers/${id}/dispatch`,
    undefined,
    { headers: contextLocationId ? { 'X-Location-Id': contextLocationId } : undefined },
  )
  return data
}

export async function receiveStockTransfer(
  id: string,
  lines: Array<{ lineId?: string; productId: string; variantId?: string; qtyReceived: number }>,
  contextLocationId?: string,
): Promise<StockTransferRow> {
  const { data } = await apiClient.post<StockTransferRow>(
    `/api/v1/stock/transfers/${id}/receive`,
    { lines },
    { headers: contextLocationId ? { 'X-Location-Id': contextLocationId } : undefined },
  )
  return data
}

export async function rejectStockTransfer(id: string, contextLocationId?: string): Promise<StockTransferRow> {
  const { data } = await apiClient.post<StockTransferRow>(
    `/api/v1/stock/transfers/${id}/reject`,
    undefined,
    { headers: contextLocationId ? { 'X-Location-Id': contextLocationId } : undefined },
  )
  return data
}

export function transferQty(line: StockTransferLine): number {
  const n = typeof line.qty === 'number' ? line.qty : Number(line.qty)
  return Number.isFinite(n) ? n : 0
}
