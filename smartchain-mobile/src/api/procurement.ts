import {apiClient} from './client';
import type {CreatePOPayload} from '../utils/procurementPayload';

export type {CreatePOPayload, CreatePOResponse, POLineRequest, InlineSupplierRequest} from '../utils/procurementPayload';

export interface GrnLinePayload {
  poLineId?: string;
  productId: string;
  sku: string;
  productName: string;
  expectedQuantity?: number;
  receivedQuantity: number;
  unitCost: number;
  lotCode?: string;
  expiryDate?: string;
  location?: string;
}

export interface CreateGrnPayload {
  notes?: string;
  lines: GrnLinePayload[];
}

export async function createPurchaseOrder(body: CreatePOPayload) {
  const {data} = await apiClient.post<Record<string, unknown>>(
    '/procurement/purchase-orders',
    body,
  );
  return data;
}

export async function sendPurchaseOrder(
  poId: string,
  sentVia = 'MOBILE',
) {
  const {data} = await apiClient.post<Record<string, unknown>>(
    `/procurement/purchase-orders/${poId}/send`,
    {sentVia},
  );
  return data;
}

export async function listPurchaseOrders(status?: string, page = 0, size = 50) {
  const {data} = await apiClient.get<{
    content?: Record<string, unknown>[];
  }>('/procurement/purchase-orders', {
    params: {
      ...(status ? {status} : {}),
      page: String(page),
      size: String(size),
    },
  });
  return data.content ?? data;
}

export async function getPurchaseOrder(poId: string) {
  const {data} = await apiClient.get<Record<string, unknown>>(
    `/procurement/purchase-orders/${poId}`,
  );
  return data;
}

export async function createGrnForPo(poId: string, body: CreateGrnPayload) {
  const {data} = await apiClient.post<Record<string, unknown>>(
    `/procurement/purchase-orders/${poId}/grn`,
    body,
  );
  return data;
}

export async function confirmGrn(grnId: string) {
  const {data} = await apiClient.post<Record<string, unknown>>(
    `/procurement/purchase-orders/grn/${grnId}/confirm`,
  );
  return data;
}

export async function createPoFromLowStock(productId: string) {
  const {data} = await apiClient.post<Record<string, unknown>>(
    `/procurement/purchase-orders/from-low-stock/${productId}`,
  );
  return data;
}
