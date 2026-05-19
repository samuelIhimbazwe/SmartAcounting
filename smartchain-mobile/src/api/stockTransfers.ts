import {apiCall} from './client';

export type StockTransferLine = {
  id?: string;
  productId: string;
  variantId?: string;
  qty: number;
};

export type StockTransferDto = {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  status: string;
  lines: StockTransferLine[];
};

export async function createStockTransfer(body: {
  toLocationId: string;
  lines: Array<{productId: string; variantId?: string; qty: number}>;
}): Promise<StockTransferDto> {
  return apiCall<StockTransferDto>('/stock/transfers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchIncomingTransfers(): Promise<StockTransferDto[]> {
  return apiCall<StockTransferDto[]>('/stock/transfers/incoming');
}

export async function receiveStockTransfer(
  id: string,
  lines: Array<{
    lineId?: string;
    productId: string;
    variantId?: string;
    qtyReceived: number;
  }>,
): Promise<StockTransferDto> {
  return apiCall<StockTransferDto>(`/stock/transfers/${id}/receive`, {
    method: 'PATCH',
    body: JSON.stringify({lines}),
  });
}
