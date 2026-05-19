import {apiClient} from './client';

export type CustomerDto = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  tinNumber?: string;
  customerType?: string;
  priceListId?: string;
  creditLimit?: number;
  creditBalance?: number;
  loyaltyPoints?: number;
  loyaltyEnabled?: boolean;
  notes?: string;
  alert?: boolean;
  level?: string;
};

export async function searchCustomersApi(q?: string): Promise<CustomerDto[]> {
  const {data} = await apiClient.get<CustomerDto[]>('/customers', {
    params: q ? {q} : undefined,
  });
  return data;
}

export async function getCustomerApi(id: string): Promise<CustomerDto> {
  const {data} = await apiClient.get<CustomerDto>(`/customers/${id}`);
  return data;
}

export async function createCustomerApi(body: Record<string, unknown>): Promise<CustomerDto> {
  const {data} = await apiClient.post<CustomerDto>('/customers', body);
  return data;
}

export async function updateCustomerApi(
  id: string,
  body: Record<string, unknown>,
): Promise<CustomerDto> {
  const {data} = await apiClient.put<CustomerDto>(`/customers/${id}`, body);
  return data;
}

export async function deleteCustomerApi(id: string): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}

export async function recordCustomerPayment(
  id: string,
  body: {amount: number; reference?: string; notes?: string},
): Promise<{creditBalance: number}> {
  const {data} = await apiClient.post<{creditBalance: number}>(
    `/customers/${id}/payments`,
    body,
  );
  return data;
}

export async function fetchCustomerSales(id: string) {
  const {data} = await apiClient.get(`/customers/${id}/sales`);
  return data;
}

export async function fetchLoyaltyTransactions(id: string) {
  const {data} = await apiClient.get(`/customers/${id}/loyalty-transactions`);
  return data;
}

export async function fetchActivePromotions() {
  const {data} = await apiClient.get('/promotions/active');
  return data as Record<string, unknown>[];
}

export async function listPriceListsApi() {
  const {data} = await apiClient.get('/price-lists');
  return data as Record<string, unknown>[];
}
