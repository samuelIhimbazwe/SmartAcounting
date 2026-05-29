import { apiClient } from './client'

export interface EmployeeSummary {
  id: string
  fullName: string
  department: string
  title: string
  status: string
  phone?: string | null
  email?: string | null
  hireDate?: string | null
  baseSalary?: number | string | null
  createdAt?: string
}

export interface EmployeeProfileDetails {
  address?: string
  nationalId?: string
  tinNumber?: string
  rssbNumber?: string
  ramaNumber?: string
  bankAccount?: string
  bankName?: string
  emergencyContact?: string
  contractType?: string
  contractEndDate?: string
  location?: string
  salary?: number | string
  leaveBalances?: {
    annual?: number
    sick?: number
    maternity?: number
  }
}

export interface EmployeeDetail extends EmployeeSummary {
  profile?: EmployeeProfileDetails
}

export interface CreateEmployeePayload {
  fullName: string
  department: string
  title: string
}

export interface UpdateEmployeePayload {
  fullName?: string
  department?: string
  title?: string
  status?: string
  phone?: string
  email?: string
  hireDate?: string
  profile?: EmployeeProfileDetails
}

export interface LeaveRequestRow {
  id: string
  employeeId: string
  employeeName?: string
  leaveType: string
  startDate: string
  endDate: string
  status: string
  reason?: string | null
  days?: number
  createdAt?: string
}

export interface CreateLeavePayload {
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  reason?: string
}

export interface ShiftRow {
  id: string
  shiftName: string
  startTime: string
  endTime: string
  location?: string | null
  createdAt?: string
}

export interface ShiftAssignmentRow {
  id: string
  employeeId: string
  shiftId: string
  assignedDate: string
  tillCode?: string | null
  status: string
}

export interface EmployeeAttendanceSummary {
  period: string
  presentDays: number
  absentDays: number
  lateArrivals: number
  overtimeHours: number
}

export interface EmployeePayslipRow {
  lineId: string
  payrollRunId: string
  period: string
  status: string
  netPay?: number | string
  grossSalary?: number | string
  createdAt?: string
}

export async function listEmployees(params?: {
  q?: string
  department?: string
  status?: string
  page?: number
  size?: number
}): Promise<EmployeeSummary[]> {
  const { data } = await apiClient.get<EmployeeSummary[]>('/api/v1/hr/employees', { params })
  return Array.isArray(data) ? data : []
}

export async function getEmployee(id: string): Promise<EmployeeDetail> {
  const { data } = await apiClient.get<EmployeeDetail>(`/api/v1/hr/employees/${id}`)
  return data
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<{ employeeId: string }> {
  const { data } = await apiClient.post<{ employeeId: string }>('/api/v1/hr/employees', payload)
  return data
}

export async function updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<EmployeeDetail> {
  const { data } = await apiClient.put<EmployeeDetail>(`/api/v1/hr/employees/${id}`, payload)
  return data
}

export async function listLeaveRequests(params?: {
  employeeId?: string
  leaveType?: string
  status?: string
  page?: number
  size?: number
}): Promise<LeaveRequestRow[]> {
  const { data } = await apiClient.get<LeaveRequestRow[]>('/api/v1/hr/leave', { params })
  return Array.isArray(data) ? data : []
}

export async function createLeaveRequest(payload: CreateLeavePayload): Promise<{ leaveRequestId: string }> {
  const { data } = await apiClient.post<{ leaveRequestId: string }>('/api/v1/hr/leave', payload)
  return data
}

export async function approveLeaveRequest(id: string): Promise<LeaveRequestRow> {
  const { data } = await apiClient.post<LeaveRequestRow>(`/api/v1/hr/leave/${id}/approve`)
  return data
}

export async function rejectLeaveRequest(id: string): Promise<LeaveRequestRow> {
  const { data } = await apiClient.post<LeaveRequestRow>(`/api/v1/hr/leave/${id}/reject`)
  return data
}

export async function listShifts(): Promise<ShiftRow[]> {
  const { data } = await apiClient.get<ShiftRow[]>('/api/v1/hr/shifts')
  return Array.isArray(data) ? data : []
}

export async function createShift(payload: {
  shiftName: string
  startTime: string
  endTime: string
  location?: string
}): Promise<ShiftRow> {
  const { data } = await apiClient.post<ShiftRow>('/api/v1/hr/shifts', payload)
  return data
}

export async function assignShift(
  shiftId: string,
  payload: { employeeId: string; assignedDate: string; tillCode?: string },
): Promise<ShiftAssignmentRow> {
  const { data } = await apiClient.post<ShiftAssignmentRow>(`/api/v1/hr/shifts/${shiftId}/assign`, payload)
  return data
}

export async function getWeeklyRoster(weekStart: string): Promise<ShiftAssignmentRow[]> {
  const { data } = await apiClient.get<ShiftAssignmentRow[]>('/api/v1/hr/shifts/roster/week', {
    params: { weekStart },
  })
  return Array.isArray(data) ? data : []
}

export async function getEmployeeAttendanceSummary(
  employeeId: string,
  period: string,
): Promise<EmployeeAttendanceSummary> {
  const { data } = await apiClient.get<EmployeeAttendanceSummary>(
    `/api/v1/hr/employees/${employeeId}/attendance-summary/${period}`,
  )
  return data
}

export async function getEmployeePayslips(employeeId: string, limit = 6): Promise<EmployeePayslipRow[]> {
  const { data } = await apiClient.get<EmployeePayslipRow[]>(`/api/v1/hr/employees/${employeeId}/payslips`, {
    params: { limit },
  })
  return Array.isArray(data) ? data : []
}

export async function downloadEmployeePayslip(payrollRunId: string, employeeId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/api/v1/hr/payroll/runs/${payrollRunId}/payslip/${employeeId}`, {
    responseType: 'blob',
  })
  return data
}

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

export interface PayrollLineRow {
  id: string
  employeeId: string
  employeeName: string
  department: string
  grossSalary: number
  netPay: number
  paye: number
}

export async function getPayrollRun(runId: string): Promise<PayrollRun> {
  const { data } = await apiClient.get<PayrollRun>(`/api/v1/hr/payroll/runs/${runId}`)
  return data
}

export async function getPayrollRunLines(runId: string): Promise<PayrollLineRow[]> {
  const { data } = await apiClient.get<PayrollLineRow[]>(`/api/v1/hr/payroll/runs/${runId}/lines`)
  return data
}

export async function exportPayeCsvForRun(runId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/api/v1/hr/payroll/runs/${runId}/paye-export`, {
    responseType: 'blob',
  })
  return data
}

export async function downloadPayrollPayslip(runId: string, employeeId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/api/v1/hr/payroll/runs/${runId}/payslip/${employeeId}`, {
    responseType: 'blob',
  })
  return data
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPayeExportFile(runId: string, period: string) {
  const blob = await exportPayeCsvForRun(runId)
  downloadBlob(blob, `paye-${period || runId}.csv`)
}

export async function downloadEmployeePayslipFile(runId: string, employeeId: string, employeeName: string) {
  const blob = await downloadPayrollPayslip(runId, employeeId)
  const safe = employeeName.replace(/\s+/g, '-').toLowerCase()
  downloadBlob(blob, `payslip-${safe}.pdf`)
}
