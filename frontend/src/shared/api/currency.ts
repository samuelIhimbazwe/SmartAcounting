import { apiClient } from './client'

/** Converts an amount using tenant FX rates (quote-per-base); rounds to 2 dp like checkout. */
export async function currencyConvert(amount: string, from: string, to: string): Promise<string> {
  const { data } = await apiClient.get<{ amount: string }>('/api/v1/currency/convert', {
    params: { amount, from, to },
  })
  return data.amount
}

/** Post or refresh a tenant FX pair (quote-per-base: 1 base × rate = quote). ISO date `yyyy-MM-dd`. */
export async function currencyUpsertRate(payload: {
  baseCurrency: string
  quoteCurrency: string
  rate: string
  source: string
  asOfDate: string
}): Promise<{ rateId: string }> {
  const { data } = await apiClient.post<{ rateId: string }>('/api/v1/currency/rates', payload)
  return data
}
