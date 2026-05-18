import { apiClient } from './client'
import type { TransactionType, TransactionRecord } from './transactionTypes'

export type { TransactionType, TransactionRecord }

export async function submitTransaction(type: TransactionType, payload: TransactionRecord) {
  const currencyCode = payload.currency.trim().toUpperCase()
  switch (type) {
    case 'invoice':
      await apiClient.post('/api/v1/finance/invoices', {
        customerName: payload.partnerName,
        amount: payload.amount,
        currencyCode,
        dueDate: payload.dueDate,
      })
      return
    case 'purchase-order':
      await apiClient.post('/api/v1/procurement/purchase-orders', {
        supplierName: payload.partnerName,
        totalAmount: payload.amount,
        currencyCode,
      })
      return
    case 'sales-order':
      await apiClient.post('/api/v1/sales/orders', {
        customerName: payload.partnerName,
        totalAmount: payload.amount,
        currencyCode,
      })
      return
    default:
      throw new Error(`Unsupported transaction type: ${type}`)
  }
}
