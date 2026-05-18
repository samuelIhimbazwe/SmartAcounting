import { apiClient } from './client'

export type SupplierBillRow = {
  supplierBillId: string
  supplierId: string
  supplierName: string
  reference: string
  amount: string
  appliedAmount: string
  outstandingAmount: string
  currencyCode: string
  dueDate: string | null
  status: string
  createdAt: string
  overdue: boolean
}

export async function financeListSupplierBills(params?: {
  status?: string
  supplierName?: string
}): Promise<SupplierBillRow[]> {
  const { data } = await apiClient.get<SupplierBillRow[]>('/api/v1/finance/supplier-bills', {
    params: {
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.supplierName ? { supplierName: params.supplierName } : {}),
    },
  })
  return data
}

export async function financeArchiveSupplierBill(billId: string): Promise<{ supplierBillId: string }> {
  const { data } = await apiClient.post<{ supplierBillId: string }>(
    `/api/v1/finance/supplier-bills/${billId}/archive`,
    {},
  )
  return data
}

export type CustomerCreditStatus = {
  customerId: string
  customerName: string
  phone?: string | null
  currentBalance: string
  creditLimit: string
  availableCredit: string
  oldestOverdueInvoiceId: string | null
  oldestOverdueInvoiceDueDate: string | null
  badDebtRiskScore: string
}

export async function financeCustomerCreditStatus(customerId: string): Promise<CustomerCreditStatus> {
  const { data } = await apiClient.get<CustomerCreditStatus>(`/api/v1/finance/customers/${customerId}/credit-status`)
  return data
}

export type SupplierCreditStatus = {
  supplierId: string
  supplierName: string
  totalOutstanding: string
  creditLimit: string
  availableCredit: string
  nextDueDate: string | null
  paymentTermsDays: number
}

export async function financeSupplierCreditStatus(supplierId: string): Promise<SupplierCreditStatus> {
  const { data } = await apiClient.get<SupplierCreditStatus>(`/api/v1/finance/suppliers/${supplierId}/credit-status`)
  return data
}

export async function financePatchCustomerCreditLimit(
  customerId: string,
  creditLimit: string,
): Promise<CustomerCreditStatus> {
  const { data } = await apiClient.patch<CustomerCreditStatus>(`/api/v1/finance/customers/${customerId}`, {
    creditLimit,
  })
  return data
}

export async function financePatchCustomer(
  customerId: string,
  patch: { creditLimit?: string; phone?: string },
): Promise<CustomerCreditStatus> {
  const { data } = await apiClient.patch<CustomerCreditStatus>(`/api/v1/finance/customers/${customerId}`, patch)
  return data
}

export async function financePatchSupplier(
  supplierId: string,
  payload: { creditLimit?: string; paymentTermsDays?: number },
): Promise<SupplierCreditStatus> {
  const { data } = await apiClient.patch<SupplierCreditStatus>(`/api/v1/finance/suppliers/${supplierId}`, payload)
  return data
}

export type StatementReconcileResult = {
  matched: Array<{ reference: string; amount: string; supplierBillId: string }>
  systemOnly: Array<{ reference: string; amount: string; supplierBillId: string }>
  statementOnly: Array<{ reference: string; amount: string }>
  balanceDifference: string
}

export async function financeSupplierStatementReconcile(
  supplierId: string,
  invoices: Array<{ reference: string; amount: string }>,
): Promise<StatementReconcileResult> {
  const { data } = await apiClient.post<StatementReconcileResult>(
    `/api/v1/finance/suppliers/${supplierId}/statement-reconciliation`,
    { invoices },
  )
  return data
}

export async function dashboardQueueExport(pathRole: string, format: string): Promise<{ exportJobId: string }> {
  const { data } = await apiClient.post<{ exportJobId: string }>(`/api/v1/dashboards/${pathRole}/export`, {
    role: pathRole,
    format,
  })
  return data
}
