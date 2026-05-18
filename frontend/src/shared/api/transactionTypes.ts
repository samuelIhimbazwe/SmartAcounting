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
