import { apiClient } from './client'
import { getEbmConfig, saveEbmConfig, type EbmConfig } from './ebm'

export const EBM_SANDBOX_API_URL = 'https://ebm-sandbox.rra.gov.rw/api'
export const EBM_PRODUCTION_API_URL = 'https://ebm.rra.gov.rw/api'

export interface EbmIntegrationTestResult {
  configured: boolean
  active: boolean
  mode: string
  tin?: string
  message?: string
}

export interface VatCalendarEntry {
  period: string
  dueDate: string
  status: string
  submittedAt: string
  referenceNumber: string
}

export interface EbmAuditLogRow {
  id: string
  date?: string
  user?: string
  action?: string
  documentRef?: string
  status?: string
  receiptId?: string
  errorMessage?: string
}

export interface VatReturnDraft {
  period?: string
  outputVat?: number
  inputVatCredit?: number
  netVatPayable?: number
  taxableSalesNet?: number
  taxablePurchasesNet?: number
}

export interface RraTaxFilingRow {
  id: string
  filingType: string
  period: string
  status: string
  dueDate?: string
  draftPayload?: string
  rraAckReference?: string
  submittedAt?: string
}

export interface PayrollRunPayeSummary {
  id: string
  period: string
  status: string
  employeeCount?: number
  totalGross?: number
  totalPaye?: number
  totalRssbEmployee?: number
  totalRssbEmployer?: number
}

export interface PayeFilingLogRow {
  id: string
  payrollRunId: string
  period: string
  fileFormat?: string
  status: string
  rowCount?: number
  submittedAt?: string
  referenceNumber?: string
  errorMessage?: string
  createdAt: string
}

export interface RwandaComplianceHints {
  vatRatePercent?: number
  eisIntegrationToggle?: boolean
  notes?: string
}

export function isSandboxEbmUrl(url: string): boolean {
  return url.toLowerCase().includes('sandbox')
}

export async function testEbmConnection() {
  const { data } = await apiClient.get<EbmIntegrationTestResult>('/api/v1/compliance/ebm/test')
  return data
}

export async function fetchEbmConfig() {
  return getEbmConfig()
}

export async function persistEbmConfig(body: EbmConfig & { ebmApiKey?: string }) {
  return saveEbmConfig(body)
}

export async function fetchVatCalendar() {
  const { data } = await apiClient.get<VatCalendarEntry[]>('/api/v1/compliance/vat/calendar')
  return Array.isArray(data) ? data : []
}

export async function refreshVatReturn(period: string) {
  const { data } = await apiClient.post<RraTaxFilingRow[]>(
    `/api/v1/compliance/rwanda/vat/returns/${period}/refresh`,
  )
  return data
}

export async function submitVatReturn(period: string) {
  const { data } = await apiClient.post<RraTaxFilingRow>(
    `/api/v1/compliance/rwanda/vat/returns/${period}/submit`,
  )
  return data
}

export async function listRraFilings(period: string) {
  const { data } = await apiClient.get<RraTaxFilingRow[]>('/api/v1/compliance/rwanda/filings', {
    params: { period },
  })
  return Array.isArray(data) ? data : []
}

export function parseVatDraft(filing: RraTaxFilingRow | undefined): VatReturnDraft | null {
  if (!filing?.draftPayload) {
    return null
  }
  try {
    return JSON.parse(filing.draftPayload) as VatReturnDraft
  } catch {
    return null
  }
}

export async function fetchEbmAuditLog(page = 0, size = 200) {
  const { data } = await apiClient.get<{
    items: EbmAuditLogRow[]
    total: number
    page: number
    size: number
  }>('/api/v1/compliance/ebm/audit-log', { params: { page, size } })
  return data
}

export async function fetchRwandaComplianceHints() {
  const { data } = await apiClient.get<RwandaComplianceHints>('/api/v1/compliance/rwanda/hints')
  return data
}

export async function listPayrollRunsForPaye() {
  const { data } = await apiClient.get<PayrollRunPayeSummary[]>('/api/v1/hr/payroll/runs')
  return Array.isArray(data) ? data : []
}

export async function exportPayeCsv(runId: string, period?: string) {
  const { data } = await apiClient.post<Blob>(
    '/api/v1/hr/payroll/paye-export',
    { runId, period: period ?? null },
    { responseType: 'blob' },
  )
  return data
}

export async function listPayeFilingLog() {
  const { data } = await apiClient.get<PayeFilingLogRow[]>('/api/v1/hr/payroll/paye-filing-log')
  return Array.isArray(data) ? data : []
}
