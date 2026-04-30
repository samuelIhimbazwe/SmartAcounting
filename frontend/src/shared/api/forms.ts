import { apiClient } from './client'

export type TransactionType = 'invoice' | 'purchase-order' | 'sales-order'

export interface TransactionRecord {
  documentNumber: string
  partnerName: string
  amount: number
  currency: string
  dueDate: string
  notes?: string
  taxRate?: number
  costCenter?: string
  expectedCloseDate?: string
}

export async function submitTransaction(type: TransactionType, payload: TransactionRecord) {
  await apiClient.post(`/api/v1/transactions/${type}`, payload)
}
