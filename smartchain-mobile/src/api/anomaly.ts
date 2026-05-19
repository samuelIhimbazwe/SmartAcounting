import {apiCall} from './client';

export async function reviewAnomalyAlert(alert: Record<string, unknown>) {
  return apiCall<{anomalyCaseId: string; status: string}>(
    '/anomaly/alerts/reviewed',
    {
      method: 'POST',
      body: JSON.stringify(alert),
    },
  );
}

export async function escalateAnomalyAlert(
  alert: Record<string, unknown>,
  note?: string,
) {
  return apiCall<{anomalyCaseId: string; status: string; actionId: string}>(
    '/anomaly/alerts/escalate',
    {
      method: 'POST',
      body: JSON.stringify({alert, note: note ?? ''}),
    },
  );
}
