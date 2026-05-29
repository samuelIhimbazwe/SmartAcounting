import { apiClient } from './client'

export interface CustomerSummary {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  creditLimit?: number | string | null
  creditBalance?: number | string | null
  loyaltyPoints?: number | null
  loyaltyEnabled?: boolean | null
  priceListId?: string | null
  notes?: string | null
  level?: string
  alert?: boolean
  customerType?: string
  createdAt?: string | null
  lastPurchaseAt?: string | null
}

export interface CustomerUpsertPayload {
  name: string
  phone?: string
  email?: string
  creditLimit?: number
  priceListId?: string
  notes?: string
  loyaltyEnabled?: boolean
  customerType?: string
}

export interface CustomerSaleRow {
  salesOrderId: string
  totalAmount?: number | string
  currencyCode?: string
  createdAt?: string
  status?: string
  paymentMethod?: string
  itemSummary?: string
}

export interface CustomerCreditLine {
  type?: string
  amount?: number | string
  runningBalance?: number | string
  createdAt?: string
  dueDate?: string
  description?: string
  reference?: string
  overdue?: boolean
}

export interface LoyaltyTransactionRow {
  id: string
  transactionType: string
  points: number
  amountRwf?: number | string | null
  salesOrderId?: string | null
  notes?: string | null
  createdAt?: string
}

export interface CustomerPaymentPayload {
  amount: number
  reference?: string
  notes?: string
}

export interface PriceListOption {
  id: string
  name: string
}

export interface LayawayOrderRow {
  id: string
  status: string
  currencyCode?: string
  totalAmount?: number | string
  depositAmount?: number | string
  balanceDue?: number | string
  collectionDate?: string | null
  salesOrderId?: string | null
  createdAt?: string
}

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function customerCreditUsed(c: CustomerSummary): number {
  return num(c.creditBalance)
}

export function customerCreditLimit(c: CustomerSummary): number {
  return num(c.creditLimit)
}

export function customerLoyaltyPoints(c: CustomerSummary): number {
  return num(c.loyaltyPoints)
}

export async function listCustomers(search?: string): Promise<CustomerSummary[]> {
  const term = search?.trim()
  const { data } = await apiClient.get<CustomerSummary[]>('/api/v1/customers', {
    params: term ? { search: term, q: term } : undefined,
  })
  return Array.isArray(data) ? data : []
}

export async function getCustomer(id: string): Promise<CustomerSummary> {
  const { data } = await apiClient.get<CustomerSummary>(`/api/v1/customers/${id}`)
  return data
}

export async function createCustomer(payload: CustomerUpsertPayload): Promise<CustomerSummary> {
  const { data } = await apiClient.post<CustomerSummary>('/api/v1/customers', payload)
  return data
}

export async function updateCustomer(id: string, payload: CustomerUpsertPayload): Promise<CustomerSummary> {
  const { data } = await apiClient.put<CustomerSummary>(`/api/v1/customers/${id}`, payload)
  return data
}

export async function getCustomerSales(id: string): Promise<CustomerSaleRow[]> {
  const { data } = await apiClient.get<CustomerSaleRow[]>(`/api/v1/customers/${id}/sales`)
  return Array.isArray(data) ? data : []
}

export async function getCustomerCredit(id: string): Promise<CustomerCreditLine[]> {
  const { data } = await apiClient.get<CustomerCreditLine[]>(`/api/v1/customers/${id}/credit`)
  return Array.isArray(data) ? data : []
}

export async function recordCustomerPayment(
  id: string,
  payload: CustomerPaymentPayload,
): Promise<{ customerId: string; creditBalance: number | string }> {
  const { data } = await apiClient.post(`/api/v1/customers/${id}/payments`, payload)
  return data
}

export async function getCustomerLoyaltyTransactions(id: string): Promise<LoyaltyTransactionRow[]> {
  const { data } = await apiClient.get<LoyaltyTransactionRow[]>(`/api/v1/customers/${id}/loyalty-transactions`)
  return Array.isArray(data) ? data : []
}

export async function adjustCustomerLoyaltyPoints(
  id: string,
  payload: { transactionType: string; points: number; notes?: string },
): Promise<CustomerSummary> {
  const { data } = await apiClient.post<CustomerSummary>(`/api/v1/customers/${id}/loyalty-transactions`, payload)
  return data
}

export async function getCustomerLayaways(id: string, status?: string): Promise<LayawayOrderRow[]> {
  const { data } = await apiClient.get<LayawayOrderRow[]>(`/api/v1/customers/${id}/layaways`, {
    params: status ? { status } : undefined,
  })
  return Array.isArray(data) ? data : []
}

export interface CreateLayawayPayload {
  totalAmount: number
  depositAmount: number
  currencyCode?: string
  cartJson: string
  collectionDate?: string
}

export async function createCustomerLayaway(
  customerId: string,
  payload: CreateLayawayPayload,
): Promise<LayawayOrderRow> {
  const { data } = await apiClient.post<LayawayOrderRow>(`/api/v1/customers/${customerId}/layaways`, payload)
  return data
}

export async function recordLayawayPayment(
  customerId: string,
  layawayId: string,
  payload: { amount: number; tenderType?: string },
): Promise<LayawayOrderRow> {
  const { data } = await apiClient.post<LayawayOrderRow>(
    `/api/v1/customers/${customerId}/layaways/${layawayId}/payments`,
    payload,
  )
  return data
}

export async function collectCustomerLayaway(customerId: string, layawayId: string): Promise<LayawayOrderRow> {
  const { data } = await apiClient.post<LayawayOrderRow>(
    `/api/v1/customers/${customerId}/layaways/${layawayId}/collect`,
  )
  return data
}

export async function cancelCustomerLayaway(customerId: string, layawayId: string): Promise<LayawayOrderRow> {
  const { data } = await apiClient.post<LayawayOrderRow>(
    `/api/v1/customers/${customerId}/layaways/${layawayId}/cancel`,
  )
  return data
}

export async function listPriceLists(): Promise<PriceListOption[]> {
  try {
    const { data } = await apiClient.get<Array<Record<string, unknown>>>('/api/v1/customers/price-list-options')
    if (!Array.isArray(data)) return []
    return data.map(row => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? row.id ?? 'Price list'),
    }))
  } catch {
    try {
      const { data } = await apiClient.get<Array<Record<string, unknown>>>('/api/v1/price-lists')
      if (!Array.isArray(data)) return []
      return data.map(row => ({
        id: String(row.id ?? row.priceListId ?? ''),
        name: String(row.name ?? row.label ?? row.id ?? 'Price list'),
      }))
    } catch {
      return []
    }
  }
}
