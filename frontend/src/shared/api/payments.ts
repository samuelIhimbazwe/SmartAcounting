import { apiClient } from './client'

export type MomoProvider = 'MTN' | 'AIRTEL_MONEY'

export interface MomoVerifyResult {
  status: 'CONFIRMED' | 'FAILED'
  message: string
  transactionCode?: string
  amount?: number
  tenantId?: string
}

export async function verifyMomoPayment(body: {
  transactionCode: string
  provider: MomoProvider
  amount: number
  phoneNumber?: string
}): Promise<MomoVerifyResult> {
  const { data } = await apiClient.post<MomoVerifyResult>('/api/v1/payments/momo/verify', {
    transactionCode: body.transactionCode,
    provider: body.provider === 'AIRTEL_MONEY' ? 'AIRTEL' : 'MTN',
    amount: body.amount,
    ...(body.phoneNumber?.trim() ? { phoneNumber: body.phoneNumber.trim() } : {}),
  })
  return data
}
