import {apiClient} from './client';

export type LayawayServerRow = {
  id: string;
  status: string;
  currencyCode?: string;
  totalAmount?: number | string;
  depositAmount?: number | string;
  balanceDue?: number | string;
  collectionDate?: string | null;
  createdAt?: string;
};

export async function createLayawayOnServer(
  customerServerId: string,
  payload: {
    totalAmount: number;
    depositAmount: number;
    currencyCode: string;
    cartJson: string;
    collectionDate?: string;
  },
): Promise<LayawayServerRow> {
  const {data} = await apiClient.post<LayawayServerRow>(
    `/customers/${customerServerId}/layaways`,
    payload,
  );
  return data;
}

export async function recordLayawayPaymentOnServer(
  customerServerId: string,
  layawayServerId: string,
  amount: number,
): Promise<LayawayServerRow> {
  const {data} = await apiClient.post<LayawayServerRow>(
    `/customers/${customerServerId}/layaways/${layawayServerId}/payments`,
    {amount, tenderType: 'CASH'},
  );
  return data;
}

export async function collectLayawayOnServer(
  customerServerId: string,
  layawayServerId: string,
): Promise<LayawayServerRow> {
  const {data} = await apiClient.post<LayawayServerRow>(
    `/customers/${customerServerId}/layaways/${layawayServerId}/collect`,
    {},
  );
  return data;
}

export async function cancelLayawayOnServer(
  customerServerId: string,
  layawayServerId: string,
): Promise<LayawayServerRow> {
  const {data} = await apiClient.post<LayawayServerRow>(
    `/customers/${customerServerId}/layaways/${layawayServerId}/cancel`,
    {},
  );
  return data;
}
