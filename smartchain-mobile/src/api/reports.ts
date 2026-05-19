import {apiClient} from './client';

export async function fetchZReportPreview(
  tillSessionId: string,
  reportType: 'Z' | 'X' = 'X',
  closingCash?: number,
  cashierName?: string,
) {
  const {data} = await apiClient.get<Record<string, unknown>>('/reports/z-report', {
    params: {
      tillSessionId,
      reportType,
      ...(closingCash != null ? {closingCash: String(closingCash)} : {}),
      ...(cashierName ? {cashierName} : {}),
    },
  });
  return data;
}

export async function postZReport(body: {
  tillSessionId: string;
  reportType: string;
  closingCash?: number;
  cashierName?: string;
}) {
  const {data} = await apiClient.post<Record<string, unknown>>(
    '/reports/z-report',
    body,
  );
  return data;
}
