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
