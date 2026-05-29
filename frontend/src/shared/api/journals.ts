import { apiClient } from './client'

export type JournalLine = {
  account: string
  description: string
  debit: number
  credit: number
}

export type JournalSummary = {
  id: string
  entryDate: string
  referenceNumber: string
  description: string
  debitTotal: number
  creditTotal: number
  status: string
  currencyCode: string
  postedBy: string | null
  postedAt: string | null
}

export type JournalDetail = JournalSummary & {
  lines: JournalLine[]
  reversedFromId: string | null
}

export type LedgerAccountOption = {
  accountCode: string
  accountName: string
  accountType: string
}

export async function journalsListAccounts(): Promise<LedgerAccountOption[]> {
  const { data } = await apiClient.get<LedgerAccountOption[]>('/api/v1/finance/accounts')
  return data
}

export async function journalsList(params?: {
  fromDate?: string
  toDate?: string
  account?: string
  status?: string
}): Promise<JournalSummary[]> {
  const { data } = await apiClient.get<JournalSummary[]>('/api/v1/finance/journal-entries', {
    params: {
      ...(params?.fromDate ? { fromDate: params.fromDate } : {}),
      ...(params?.toDate ? { toDate: params.toDate } : {}),
      ...(params?.account ? { account: params.account } : {}),
      ...(params?.status ? { status: params.status } : {}),
    },
  })
  return data
}

export async function journalsGet(id: string): Promise<JournalDetail> {
  const { data } = await apiClient.get<JournalDetail>(`/api/v1/finance/journal-entries/${id}`)
  return data
}

export async function journalsNextReference(entryDate?: string): Promise<string> {
  const { data } = await apiClient.get<{ referenceNumber: string }>(
    '/api/v1/finance/journal-entries/next-reference',
    { params: entryDate ? { entryDate } : {} },
  )
  return data.referenceNumber
}

export async function journalsCreate(payload: {
  referenceNumber?: string
  entryDate: string
  description: string
  currencyCode: string
  lines: JournalLine[]
  post: boolean
}): Promise<{ journalEntryId: string }> {
  const { data } = await apiClient.post<{ journalEntryId: string }>(
    '/api/v1/finance/journal-entries',
    payload,
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return data
}

export async function journalsPost(id: string): Promise<{ journalEntryId: string }> {
  const { data } = await apiClient.post<{ journalEntryId: string }>(
    `/api/v1/finance/journal-entries/${id}/post`,
  )
  return data
}

export async function journalsReverse(id: string): Promise<{ journalEntryId: string }> {
  const { data } = await apiClient.post<{ journalEntryId: string }>(
    `/api/v1/finance/journal-entries/${id}/reverse`,
  )
  return data
}
