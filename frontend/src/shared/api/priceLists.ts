import { apiClient } from './client'

export type PriceListType = 'STANDARD' | 'WHOLESALE' | 'VIP' | 'PROMOTIONAL'
export type PriceListStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED'

export interface PriceListSummary {
  id: string
  name: string
  listType: PriceListType
  currencyCode?: string
  discountPct?: number | string | null
  validFrom?: string | null
  validTo?: string | null
  minOrderQty?: number
  active?: boolean
  status: PriceListStatus
  customersAssigned: number
  products: number
}

export interface PriceListLineRow {
  id: string
  productId: string
  productName?: string
  sku?: string | null
  variantId?: string | null
  unitPrice: number | string
  standardPrice?: number | string | null
  differencePct?: number | string | null
}

export interface PriceListCustomerRow {
  id: string
  name: string
  phone?: string | null
  email?: string | null
}

export interface PriceListDetail extends PriceListSummary {
  lines: PriceListLineRow[]
  customers: PriceListCustomerRow[]
}

export interface UpsertPriceListPayload {
  name?: string
  listType?: PriceListType
  currencyCode?: string
  discountPct?: number | null
  validFrom?: string | null
  validTo?: string | null
  minOrderQty?: number
  active?: boolean
  lines?: Array<{ lineId?: string; productId: string; variantId?: string; unitPrice: number }>
}

export const PRICE_LIST_TYPE_LABELS: Record<PriceListType, string> = {
  STANDARD: 'Standard',
  WHOLESALE: 'Wholesale',
  VIP: 'VIP Customer',
  PROMOTIONAL: 'Promotional',
}

export const PRICE_LIST_STATUS_LABELS: Record<PriceListStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SCHEDULED: 'Scheduled',
  EXPIRED: 'Expired',
}

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapSummary(row: Record<string, unknown>): PriceListSummary {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Price list'),
    listType: (String(row.listType ?? 'STANDARD').toUpperCase() as PriceListType) || 'STANDARD',
    currencyCode: row.currencyCode != null ? String(row.currencyCode) : undefined,
    discountPct: row.discountPct as number | string | null | undefined,
    validFrom: row.validFrom != null ? String(row.validFrom) : null,
    validTo: row.validTo != null ? String(row.validTo) : null,
    minOrderQty: num(row.minOrderQty) || 1,
    active: row.active !== false,
    status: (String(row.status ?? 'ACTIVE').toUpperCase() as PriceListStatus) || 'ACTIVE',
    customersAssigned: num(row.customersAssigned),
    products: num(row.products),
  }
}

function mapLine(row: Record<string, unknown>): PriceListLineRow {
  return {
    id: String(row.id ?? ''),
    productId: String(row.productId ?? ''),
    productName: row.productName != null ? String(row.productName) : undefined,
    sku: row.sku != null ? String(row.sku) : null,
    variantId: row.variantId != null ? String(row.variantId) : null,
    unitPrice: row.unitPrice as number | string,
    standardPrice: row.standardPrice as number | string | null | undefined,
    differencePct: row.differencePct as number | string | null | undefined,
  }
}

function mapCustomer(row: Record<string, unknown>): PriceListCustomerRow {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Customer'),
    phone: row.phone != null ? String(row.phone) : null,
    email: row.email != null ? String(row.email) : null,
  }
}

export async function listPriceListSummaries(): Promise<PriceListSummary[]> {
  const { data } = await apiClient.get<Array<Record<string, unknown>>>('/api/v1/price-lists')
  return Array.isArray(data) ? data.map(mapSummary) : []
}

export async function getPriceList(id: string): Promise<PriceListDetail> {
  const { data } = await apiClient.get<Record<string, unknown>>(`/api/v1/price-lists/${id}`)
  return {
    ...mapSummary(data),
    lines: Array.isArray(data.lines) ? data.lines.map(r => mapLine(r as Record<string, unknown>)) : [],
    customers: Array.isArray(data.customers)
      ? data.customers.map(r => mapCustomer(r as Record<string, unknown>))
      : [],
  }
}

export async function createPriceList(payload: UpsertPriceListPayload): Promise<PriceListDetail> {
  const { data } = await apiClient.post<Record<string, unknown>>('/api/v1/price-lists', payload)
  return {
    ...mapSummary(data),
    lines: Array.isArray(data.lines) ? data.lines.map(r => mapLine(r as Record<string, unknown>)) : [],
    customers: Array.isArray(data.customers)
      ? data.customers.map(r => mapCustomer(r as Record<string, unknown>))
      : [],
  }
}

export async function updatePriceList(id: string, payload: UpsertPriceListPayload): Promise<PriceListDetail> {
  const { data } = await apiClient.put<Record<string, unknown>>(`/api/v1/price-lists/${id}`, payload)
  return {
    ...mapSummary(data),
    lines: Array.isArray(data.lines) ? data.lines.map(r => mapLine(r as Record<string, unknown>)) : [],
    customers: Array.isArray(data.customers)
      ? data.customers.map(r => mapCustomer(r as Record<string, unknown>))
      : [],
  }
}

export async function assignPriceListCustomer(priceListId: string, customerId: string): Promise<void> {
  await apiClient.post(`/api/v1/price-lists/${priceListId}/customers/${customerId}`)
}

export async function unassignPriceListCustomer(priceListId: string, customerId: string): Promise<void> {
  await apiClient.delete(`/api/v1/price-lists/${priceListId}/customers/${customerId}`)
}

export function priceListDifferenceLabel(pct: number | string | null | undefined): string {
  if (pct == null || pct === '') return '—'
  const n = num(pct)
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export function priceListStatusTone(status: PriceListStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800'
    case 'SCHEDULED':
      return 'bg-sky-100 text-sky-800'
    case 'EXPIRED':
      return 'bg-neutral-200 text-neutral-700'
    case 'INACTIVE':
    default:
      return 'bg-amber-100 text-amber-800'
  }
}
