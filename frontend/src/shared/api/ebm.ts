import { apiClient } from './client'

export interface EbmConfig {
  ebmTin: string
  ebmDeviceSerial: string
  ebmApiUrl: string
  isActive?: boolean
}

export interface EbmReceipt {
  id: string
  salesOrderId?: string
  posTransactionId?: string
  status: string
  ebmReceiptNumber?: string
  submittedAt?: string
  transactionDate?: string
  grossAmount?: number
  errorMessage?: string
}

export interface EbmComplianceReport {
  period: string
  totalTransactions: number
  confirmedSubmissions: number
  failedSubmissions: number
  pendingSubmissions: number
  coverageRate: number
  isCompliant: boolean
}

export async function getEbmConfig() {
  const { data, status } = await apiClient.get<EbmConfig>('/api/v1/compliance/ebm/config', {
    validateStatus: (s) => s === 200 || s === 204,
  })
  return status === 204 ? null : data
}

export async function saveEbmConfig(body: EbmConfig & { ebmApiKey?: string }) {
  const { data } = await apiClient.post<EbmConfig>('/api/v1/compliance/ebm/config', body)
  return data
}

export async function listEbmReceipts(status?: string, page = 0, size = 20) {
  const { data } = await apiClient.get<{ content: EbmReceipt[] }>('/api/v1/compliance/ebm/receipts', {
    params: { status, page, size },
  })
  return data.content ?? []
}

export async function getEbmReport(period: string) {
  const { data } = await apiClient.get<EbmComplianceReport>(`/api/v1/compliance/ebm/report/${period}`)
  return data
}

export async function retryEbmReceipt(receiptId: string) {
  const { data } = await apiClient.post<EbmReceipt>(`/api/v1/compliance/ebm/receipts/${receiptId}/retry`)
  return data
}
