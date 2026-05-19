import {apiCall} from './client';

export type MomoVerifyResult = {
  status: 'CONFIRMED' | 'FAILED';
  message: string;
  transactionCode?: string;
  amount?: number;
};

export async function verifyMomoTransaction(body: {
  transactionCode: string;
  provider: 'MTN' | 'AIRTEL_MONEY';
  amount: number;
}): Promise<MomoVerifyResult> {
  return apiCall<MomoVerifyResult>('/payments/momo/verify', {
    method: 'POST',
    body: JSON.stringify({
      transactionCode: body.transactionCode,
      provider: body.provider === 'AIRTEL_MONEY' ? 'AIRTEL' : 'MTN',
      amount: body.amount,
    }),
  });
}
