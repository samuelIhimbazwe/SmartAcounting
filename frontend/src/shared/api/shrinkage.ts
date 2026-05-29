import { apiClient } from './client'

export interface ShrinkageRecordRow {
  id: string
  productId: string
  sku?: string
  productName?: string
  quantity?: number | string
  unitCost?: number | string
  totalCost?: number | string
  reason?: string
  recordedBy?: string
  location?: string
  incidentDate?: string
  notes?: string
  createdAt?: string
}

export interface ShrinkageSummaryRow {
  from: string
  to: string
  totalCost: number | string
  recordCount: number
  byReason?: Record<string, number | string>
}

export interface RecordShrinkagePayload {
  productId: string
  sku: string
  productName: string
  quantity: number
  unitCost: number
  reason: string
  location?: string
  incidentDate?: string
  notes?: string
}

export interface ShrinkageListParams {
  from?: string
  to?: string
  page?: number
  size?: number
}

type SpringPage<T> = { content?: T[]; totalElements?: number }

export async function listShrinkage(params?: ShrinkageListParams): Promise<ShrinkageRecordRow[]> {
  const { data } = await apiClient.get<SpringPage<ShrinkageRecordRow> | ShrinkageRecordRow[]>(
    '/api/v1/inventory/shrinkage',
    { params: { page: 0, size: 200, ...params } },
  )
  if (Array.isArray(data)) return data
  return data.content ?? []
}

export async function recordShrinkage(payload: RecordShrinkagePayload): Promise<ShrinkageRecordRow> {
  const { data } = await apiClient.post<ShrinkageRecordRow>('/api/v1/inventory/shrinkage', payload)
  return data
}

export async function getShrinkageSummary(from: string, to: string): Promise<ShrinkageSummaryRow> {
  const { data } = await apiClient.get<ShrinkageSummaryRow>('/api/v1/inventory/shrinkage/summary', {
    params: { from, to },
  })
  return data
}

export function shrinkageQty(row: ShrinkageRecordRow): number {
  const n = typeof row.quantity === 'number' ? row.quantity : Number(row.quantity)
  return Number.isFinite(n) ? n : 0
}

export async function getShrinkageUnitCost(productId: string, location?: string): Promise<number> {
  const { data } = await apiClient.get<{ unitCost: number | string }>('/api/v1/inventory/shrinkage/unit-cost', {
    params: { productId, location },
  })
  const n = typeof data.unitCost === 'number' ? data.unitCost : Number(data.unitCost)
  return Number.isFinite(n) ? n : 0
}

export function shrinkageValue(row: ShrinkageRecordRow): number {
  const n = typeof row.totalCost === 'number' ? row.totalCost : Number(row.totalCost)
  return Number.isFinite(n) ? n : 0
}
