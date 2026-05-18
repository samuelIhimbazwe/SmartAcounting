import {apiClient} from './client';

export interface KpiDto {
  id?: string;
  label?: string;
  value?: string | number;
  format?: string;
  [key: string]: unknown;
}

export async function fetchDashboardKpis(rolePath: string) {
  const {data} = await apiClient.get<KpiDto[]>(`/dashboards/${rolePath}/kpis`);
  return data;
}
