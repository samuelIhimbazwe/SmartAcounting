import {apiClient} from './client';

export async function fetchBalances(location?: string) {
  const {data} = await apiClient.get<Record<string, unknown>[]>(
    '/inventory/balances',
    {params: location ? {location} : undefined},
  );
  return data;
}

export async function fetchLowStock(location?: string) {
  const {data} = await apiClient.get<Record<string, unknown>[]>(
    '/inventory/low-stock',
    {params: location ? {location} : undefined},
  );
  return data;
}

export async function fetchExpiryRisk(daysAhead = 30, location?: string) {
  const {data} = await apiClient.get<Record<string, unknown>[]>(
    '/inventory/expiry-risk',
    {params: {daysAhead: String(daysAhead), ...(location ? {location} : {})}},
  );
  return data;
}

export async function fetchBatches(location?: string) {
  const {data} = await apiClient.get<Record<string, unknown>[]>(
    '/inventory/batches',
    {params: location ? {location} : undefined},
  );
  return data;
}

export interface ReceiveStockPayload {
  productId: string;
  location: string;
  quantity: number;
  costPrice: number;
  supplierRef: string;
  lotCode?: string;
  expiryDate?: string;
}

export async function receiveStock(body: ReceiveStockPayload) {
  const {data} = await apiClient.post<{stockMovementId?: string}>(
    '/inventory/receive',
    body,
  );
  return data;
}
