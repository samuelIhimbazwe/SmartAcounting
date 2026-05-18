import { apiClient } from './client'

export interface AttendanceSummary {
  period: string
  presentCount: number
  absentCount: number
  activeEmployees: number
}

export interface PayrollRun {
  id: string
  period: string
  status: string
  totalGross?: number
  totalNet?: number
  currencyCode?: string
}

export async function getAttendanceSummary(period: string) {
  const { data } = await apiClient.get<AttendanceSummary>(`/api/v1/hr/attendance/summary/${period}`)
  return data
}

export async function listPayrollRuns() {
  const { data } = await apiClient.get<PayrollRun[]>('/api/v1/hr/payroll/runs')
  return data
}

export async function preparePayrollRun(period: string) {
  const { data } = await apiClient.post<PayrollRun>('/api/v1/hr/payroll/runs', { period })
  return data
}

export async function approvePayrollRun(runId: string) {
  const { data } = await apiClient.post<PayrollRun>(`/api/v1/hr/payroll/runs/${runId}/approve`)
  return data
}

export async function postPayrollRun(runId: string) {
  const { data } = await apiClient.post<PayrollRun>(`/api/v1/hr/payroll/runs/${runId}/post`)
  return data
}
