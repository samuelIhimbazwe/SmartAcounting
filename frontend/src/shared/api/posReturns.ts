import { apiClient } from './client'

/** Sprint PRINT 3 — aligned with InitiateReturnRequest / PosReturn */
export type ReturnReasonCode =
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'CUSTOMER_CHANGE_MIND'
  | 'EXCHANGE'
  | 'OTHER'

export type RefundMethodCode = 'CASH' | 'MOMO' | 'AIRTEL_MONEY' | 'CARD' | 'STORE_CREDIT' | 'ON_ACCOUNT'

export type LineConditionCode = 'RESALEABLE' | 'DAMAGED' | 'EXPIRED'

export interface ReturnLinePayload {
  productId: string
  sku: string
  productName: string
  quantity: number
  unitPrice: number
  restock: boolean
  condition?: LineConditionCode
}

export interface InitiateReturnPayload {
  originalTransactionId: string
  tillCode?: string
  reason: ReturnReasonCode | string
  refundMethod: RefundMethodCode | string
  notes?: string
  lines: ReturnLinePayload[]
}

export interface PosReturnDto {
  id: string
  returnNumber: string
  originalTransactionId: string | null
  returnDate: string
  cashierId: string
  tillCode: string | null
  reason: string
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | string
  totalRefundAmount: number
  refundMethod: string
  currencyCode: string
  notes: string | null
  requiresManagerApproval: boolean
  createdAt: string
}

export async function initiatePosReturn(body: InitiateReturnPayload): Promise<PosReturnDto> {
  const { data } = await apiClient.post<PosReturnDto>('/api/v1/pos/returns', body)
  return data
}

export async function approvePosReturn(returnId: string): Promise<PosReturnDto> {
  const { data } = await apiClient.post<PosReturnDto>(`/api/v1/pos/returns/${returnId}/approve`)
  return data
}
