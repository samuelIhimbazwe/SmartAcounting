import {apiCall} from './client';

export type DemandForecastItem = {
  productId: string;
  sku: string;
  name: string;
  currentStock: number;
  predictedDemand: number;
  gapQuantity: number;
  willRunOutBeforeDelivery: boolean;
  horizonDays: number;
};

export type ReorderSuggestion = {
  suggestionId: string;
  productId: string;
  sku: string;
  name: string;
  currentOnHand: number;
  reorderPoint: number;
  suggestedOrderQty: number;
};

export async function fetchDemandForecast(horizonDays = 7) {
  return apiCall<{
    horizonDays: number;
    items: DemandForecastItem[];
  }>('/ai/analytics/demand-forecast', {
    method: 'POST',
    body: JSON.stringify({horizonDays}),
  });
}

export async function fetchReorderSuggestions() {
  return apiCall<{
    count: number;
    suggestions: ReorderSuggestion[];
  }>('/ai/reorder-suggestions');
}

export async function fetchCashFlowForecast() {
  return apiCall<{
    days: number;
    projectedBalance: number;
    negativeWithinWindow: boolean;
    series: Array<{date: string; cashIn: number; cashOut: number; balance: number}>;
  }>('/ai/analytics/cash-flow-forecast', {method: 'POST', body: JSON.stringify({days: 30})});
}

export async function approveAllReorderSuggestions() {
  return apiCall<{
    createdCount: number;
    failedCount: number;
    created: Array<{productId: string; purchaseOrderId: string}>;
    failed: Array<{productId: string; error: string}>;
  }>('/ai/reorder-suggestions/approve-all', {method: 'POST'});
}

export async function createPosFromForecastGaps(productIds: string[]) {
  return apiCall<{
    createdCount: number;
    failedCount: number;
    created: Array<{productId: string; purchaseOrderId: string}>;
    failed: Array<{productId: string; error: string}>;
  }>('/ai/analytics/demand-forecast/create-pos', {
    method: 'POST',
    body: JSON.stringify({productIds}),
  });
}
