import { apiClient } from './client'

export type ReconciliationMatchItemRow = {
  id: string
  tenantId: string
  itemType: string
  itemId: string
  amount: string
  matched: boolean
  matchGroup: string | null
  createdAt: string
}

export async function accountingListUnmatched(page = 0, size = 200): Promise<ReconciliationMatchItemRow[]> {
  const { data } = await apiClient.get<ReconciliationMatchItemRow[]>(
    '/api/v1/accounting/reconciliation/unmatched',
    { params: { page, size } },
  )
  return data
}
