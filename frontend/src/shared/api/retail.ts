import { apiClient } from './client'

export async function retailListProducts(): Promise<
  { productId: string; name: string; sku?: string | null; unit?: string | null }[]
> {
  const { data } = await apiClient.get('/api/v1/retail/products')
  return data
}

export async function retailCreateProduct(payload: {
  name: string
  sku?: string
  unit?: string
}): Promise<{ productId: string }> {
  const { data } = await apiClient.post<{ productId: string }>('/api/v1/retail/products', payload)
  return data
}

export async function inventoryBalances(location?: string): Promise<
  { productId: string; locationCode: string; quantity: string; productName?: string }[]
> {
  const { data } = await apiClient.get('/api/v1/inventory/balances', {
    params: location ? { location } : {},
  })
  return data
}

export async function inventoryBatches(location?: string): Promise<
  {
    batchId: string
    productId: string
    locationCode: string
    lotCode?: string
    expiryDate?: string
    quantityOnHand: string
    productName?: string
  }[]
> {
  const { data } = await apiClient.get('/api/v1/inventory/batches', {
    params: location ? { location } : {},
  })
  return data
}

export async function inventoryReceive(payload: {
  productId: string
  location: string
  quantity: string
  costPrice: string
  supplierRef: string
  lotCode?: string
  expiryDate?: string
  allowExpiredReceipt?: boolean
}): Promise<{ stockMovementId: string }> {
  const { data } = await apiClient.post<{ stockMovementId: string }>('/api/v1/inventory/receive', payload)
  return data
}

export async function retailTillExpected(businessDate: string, posRegisterCode: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/api/v1/retail/till/expected', {
    params: { businessDate, posRegisterCode },
  })
  return data
}

export async function retailTillClose(payload: {
  businessDate: string
  posRegisterCode: string
  countedCash: string
  countedMomo: string
  countedAirtel: string
  countedCard: string
  countedOnAccount: string
  notes?: string
}): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/v1/retail/till/close', payload)
  return data
}
