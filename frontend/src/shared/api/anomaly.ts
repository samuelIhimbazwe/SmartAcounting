import { apiClient } from './client'

export async function markAnomalyReviewed(caseId: string) {
  const response = await apiClient.post(`/api/v1/anomaly/cases/${encodeURIComponent(caseId)}/reviewed`)
  return response.data
}

export async function escalateAnomaly(caseId: string, note?: string) {
  const response = await apiClient.post(`/api/v1/anomaly/cases/${encodeURIComponent(caseId)}/escalate`, note ? { note } : {})
  return response.data
}
