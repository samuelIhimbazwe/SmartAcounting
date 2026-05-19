import {apiCall} from './client';

export type HqDashboardDto = {
  scope: string;
  totalSalesToday?: number;
  totalVoidsToday?: number;
  openTills?: number;
  cashierCount?: number;
  locations?: Array<{
    locationId: string;
    name: string;
    salesToday?: number;
    voids?: number;
    openTills?: number;
  }>;
  stockAlerts?: unknown[];
  topProducts?: unknown[];
  _note?: string;
};

export async function fetchAnalyticsDashboard(
  scope: 'all' | 'location' = 'location',
): Promise<HqDashboardDto> {
  return apiCall<HqDashboardDto>('/analytics/dashboard', {
    params: {scope},
  });
}
