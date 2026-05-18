import { apiClient } from './client'
import { financeListSupplierBills, type SupplierBillRow } from './financeExtended'

export type PaymentRun = {
  id: string
  status: string
  totalAmount: string
  paymentCount: number
  currencyCode: string
  notes?: string
  runDate?: string
}

export async function listPaymentRuns(): Promise<PaymentRun[]> {
  const { data } = await apiClient.get<PaymentRun[]>('/api/v1/finance/payment-runs')
  return data
}

export async function createPaymentRun(body: {
  fromDate: string
  toDate: string
  billStatus?: string
  notes?: string
  currencyCode?: string
}): Promise<PaymentRun> {
  const { data } = await apiClient.post<PaymentRun>('/api/v1/finance/payment-runs', body)
  return data
}

export async function approvePaymentRun(runId: string): Promise<PaymentRun> {
  const { data } = await apiClient.post<PaymentRun>(`/api/v1/finance/payment-runs/${runId}/approve`)
  return data
}

export async function executePaymentRun(runId: string): Promise<PaymentRun> {
  const { data } = await apiClient.post<PaymentRun>(`/api/v1/finance/payment-runs/${runId}/execute`)
  return data
}

export async function listApprovedSupplierBills(): Promise<SupplierBillRow[]> {
  return financeListSupplierBills({ status: 'APPROVED' })
}

export type CloseTask = {
  id: string
  period: string
  taskKey: string
  title: string
  category?: string
  status: string
}

export async function listCloseTasks(period: string): Promise<CloseTask[]> {
  const { data } = await apiClient.get<CloseTask[]>(`/api/v1/accounting/close/tasks/${period}`)
  return data
}

export async function completeCloseTask(period: string, taskKey: string): Promise<void> {
  await apiClient.post(`/api/v1/accounting/close/tasks/${period}/${taskKey}/complete`)
}

export type WorkflowRule = {
  id: string
  name: string
  triggerEvent: string
  active: boolean
  conditionsJson?: string
  actionsJson?: string
}

export async function listWorkflowRules(): Promise<WorkflowRule[]> {
  const { data } = await apiClient.get<WorkflowRule[]>('/api/v1/workflow/rules')
  return data
}

export async function createWorkflowRule(body: {
  name: string
  triggerEvent: string
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
  active?: boolean
}): Promise<{ ruleId: string }> {
  const { data } = await apiClient.post<{ ruleId: string }>('/api/v1/workflow/rules', body)
  return data
}

export type FixedAsset = {
  id: string
  assetName: string
  category: string
  cost: string
  accumulatedDepreciation?: string
  netBookValue?: string
  status: string
}

export async function listFixedAssets(page = 0, size = 50): Promise<{ content: FixedAsset[] }> {
  const { data } = await apiClient.get<{ content: FixedAsset[] }>('/api/v1/finance/fixed-assets', {
    params: { page, size },
  })
  return data
}

export async function createFixedAsset(body: Record<string, unknown>): Promise<FixedAsset> {
  const { data } = await apiClient.post<FixedAsset>('/api/v1/finance/fixed-assets', body)
  return data
}

export async function listDocuments(entityType: string, entityId: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>('/api/v1/documents', {
    params: { entityType, entityId },
  })
  return data
}
