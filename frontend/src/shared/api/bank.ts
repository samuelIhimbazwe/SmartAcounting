import { apiClient } from './client'

export interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  bankName: string
  currencyCode: string
}

export interface BankStatementLine {
  id: string
  transactionDate: string
  description: string
  reference?: string
  debitAmount?: number
  creditAmount?: number
  status: string
}

export interface BankReconciliationSummary {
  totalLines: number
  matched: number
  unmatched: number
  suggested: number
  matchRate: number
}

export async function listBankAccounts() {
  const { data } = await apiClient.get<BankAccount[]>('/api/v1/finance/bank-accounts')
  return data
}

export async function createBankAccount(body: {
  accountName: string
  accountNumber: string
  bankName: string
  currencyCode?: string
}) {
  const { data } = await apiClient.post<BankAccount>('/api/v1/finance/bank-accounts', {
    ...body,
    currencyCode: body.currencyCode ?? 'RWF',
  })
  return data
}

export async function importBankStatement(accountId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post(`/api/v1/finance/bank-accounts/${accountId}/import`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  })
  return data
}

export async function listUnmatchedLines(accountId: string, page = 0, size = 20) {
  const { data } = await apiClient.get<{ content: BankStatementLine[] }>(
    `/api/v1/finance/bank-accounts/${accountId}/unmatched`,
    { params: { page, size } },
  )
  return data.content ?? []
}

export async function getBankSummary(accountId: string) {
  const { data } = await apiClient.get<BankReconciliationSummary>(
    `/api/v1/finance/bank-accounts/${accountId}/summary`,
  )
  return data
}
