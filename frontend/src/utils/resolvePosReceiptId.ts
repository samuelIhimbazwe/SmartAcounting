import { listPosSales } from '../shared/api/posSales'
import { getLocalPosSaleHistory, listLocalPosSaleHistory } from '../services/posSaleHistory'
import { useAuthStore } from '../shared/stores/authStore'
import { apiClient } from '../shared/api/client'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Resolve receipt # or sales order UUID to a sales order id for receipt/return APIs.
 */
export async function resolvePosReceiptLookup(query: string): Promise<string> {
  const q = query.trim()
  if (!q) {
    throw new Error('Enter a receipt number or sale ID')
  }

  if (looksLikeUuid(q)) {
    return q
  }

  const tenantId = useAuthStore.getState().tenantId
  const local = listLocalPosSaleHistory(tenantId)
  const localHit = local.find(
    (r) =>
      r.receiptNumber.toLowerCase() === q.toLowerCase() ||
      r.salesOrderId.toLowerCase() === q.toLowerCase() ||
      r.salesOrderId.toLowerCase().startsWith(q.toLowerCase()),
  )
  if (localHit) {
    return localHit.salesOrderId
  }

  try {
    const { data } = await apiClient.get<{ salesOrderId?: string; id?: string }>(
      `/api/v1/pos/receipts/${encodeURIComponent(q)}`,
    )
    const id = data.salesOrderId ?? data.id
    if (id) {
      return id
    }
  } catch {
    /* fall through */
  }

  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const from = yearAgo.toISOString().slice(0, 10)
  const { rows } = await listPosSales({ from, to: todayIso(), search: q, size: 25 })
  if (rows.length === 1) {
    return rows[0].salesOrderId
  }
  const exact = rows.find((r) => r.receiptNumber.toLowerCase() === q.toLowerCase())
  if (exact) {
    return exact.salesOrderId
  }
  if (rows.length > 1) {
    throw new Error('Multiple sales match — use the full receipt or sale UUID')
  }

  const cached = getLocalPosSaleHistory(tenantId, q)
  if (cached) {
    return cached.salesOrderId
  }

  throw new Error('Sale not found. Check the receipt number or sale ID.')
}
