import { apiClient } from './client'
import { normalizeApiError } from './errors'
import { listEbmReceipts, type EbmReceipt } from './ebm'
import { posReceipt } from './pos'
import {
  getLocalPosSaleHistory,
  listLocalPosSaleHistory,
  type PosSaleHistoryEntry,
  primaryTenderLabel,
} from '../../services/posSaleHistory'
import { parsePosReceiptText } from '../../utils/parsePosReceipt'
import { useAuthStore } from '../stores/authStore'

export interface PosSaleListRow {
  salesOrderId: string
  receiptNumber: string
  createdAt: string
  customerName: string
  cashierId: string
  itemCount: number
  totalAmount: number
  currencyCode: string
  tender: string
  status: string
}

export interface PosSaleDetail extends PosSaleHistoryEntry {
  receiptText?: string
  receiptHtml?: string
  efdStatus?: 'submitted' | 'pending' | 'failed' | 'unknown'
  parsedSubtotal?: number
  parsedVat?: number
}

interface RemoteReceiptListItem {
  salesOrderId?: string
  id?: string
  receiptNumber?: string
  createdAt?: string
  customerName?: string
  cashierId?: string
  itemCount?: number
  totalAmount?: number | string
  currencyCode?: string
  tender?: string
  status?: string
}

function mapRemoteItem(item: RemoteReceiptListItem): PosSaleListRow | null {
  const salesOrderId = item.salesOrderId ?? item.id
  if (!salesOrderId) {
    return null
  }
  return {
    salesOrderId,
    receiptNumber: item.receiptNumber ?? salesOrderId.slice(0, 8).toUpperCase(),
    createdAt: item.createdAt ?? new Date().toISOString(),
    customerName: item.customerName ?? 'Walk-in',
    cashierId: item.cashierId ?? '',
    itemCount: item.itemCount ?? 0,
    totalAmount: Number(item.totalAmount ?? 0),
    currencyCode: item.currencyCode ?? 'RWF',
    tender: item.tender ?? '—',
    status: item.status ?? 'COMPLETED',
  }
}

function mapEbmToRow(r: EbmReceipt): PosSaleListRow | null {
  const salesOrderId = r.salesOrderId ?? r.posTransactionId
  if (!salesOrderId) {
    return null
  }
  return {
    salesOrderId,
    receiptNumber: r.ebmReceiptNumber ?? salesOrderId.slice(0, 8).toUpperCase(),
    createdAt: r.transactionDate ?? r.submittedAt ?? new Date().toISOString(),
    customerName: 'Walk-in',
    cashierId: '',
    itemCount: 0,
    totalAmount: Number(r.grossAmount ?? 0),
    currencyCode: 'RWF',
    tender: '—',
    status: r.status ?? 'COMPLETED',
  }
}

function mapLocalToRow(entry: PosSaleHistoryEntry): PosSaleListRow {
  return {
    salesOrderId: entry.salesOrderId,
    receiptNumber: entry.receiptNumber,
    createdAt: entry.createdAt,
    customerName: entry.customerName,
    cashierId: entry.cashierId,
    itemCount: entry.itemCount,
    totalAmount: entry.totalAmount,
    currencyCode: entry.currencyCode,
    tender: entry.primaryTender,
    status: entry.status,
  }
}

export async function listPosSales(params: {
  from: string
  to: string
  search?: string
  cashierId?: string
  page?: number
  size?: number
}): Promise<{ rows: PosSaleListRow[]; total: number }> {
  const tenantId = useAuthStore.getState().tenantId
  const page = params.page ?? 0
  const size = params.size ?? 50

  let remote: PosSaleListRow[] = []
  try {
    const { data } = await apiClient.get<{ content?: RemoteReceiptListItem[]; items?: RemoteReceiptListItem[]; total?: number }>(
      '/api/v1/pos/receipts',
      {
        params: {
          from: params.from,
          to: params.to,
          search: params.search?.trim() || undefined,
          cashierId: params.cashierId || undefined,
          page,
          size,
        },
      },
    )
    const items = data.content ?? data.items ?? []
    remote = items.map(mapRemoteItem).filter((r): r is PosSaleListRow => r !== null)
  } catch {
    remote = []
  }

  const local = listLocalPosSaleHistory(tenantId).map(mapLocalToRow)

  if (!remote.length) {
    try {
      const ebm = await listEbmReceipts(undefined, 0, 100)
      remote = ebm.map(mapEbmToRow).filter((r): r is PosSaleListRow => r !== null)
    } catch {
      /* optional enrichment */
    }
  }

  const merged = new Map<string, PosSaleListRow>()
  for (const row of [...remote, ...local]) {
    merged.set(row.salesOrderId, row)
  }

  const fromMs = new Date(`${params.from}T00:00:00`).getTime()
  const toMs = new Date(`${params.to}T23:59:59.999`).getTime()
  const q = params.search?.trim().toLowerCase() ?? ''

  let rows = [...merged.values()].filter((row) => {
    const t = new Date(row.createdAt).getTime()
    if (t < fromMs || t > toMs) {
      return false
    }
    if (params.cashierId && row.cashierId && row.cashierId !== params.cashierId) {
      return false
    }
    if (!q) {
      return true
    }
    return (
      row.receiptNumber.toLowerCase().includes(q) ||
      row.customerName.toLowerCase().includes(q) ||
      row.salesOrderId.toLowerCase().includes(q)
    )
  })

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const total = rows.length
  rows = rows.slice(page * size, page * size + size)
  return { rows, total }
}

function mapEfdStatus(status: string | undefined): PosSaleDetail['efdStatus'] {
  if (!status) {
    return 'unknown'
  }
  const s = status.toUpperCase()
  if (s.includes('CONFIRM') || s.includes('SUBMIT') || s === 'SUCCESS') {
    return 'submitted'
  }
  if (s.includes('FAIL') || s.includes('ERROR')) {
    return 'failed'
  }
  if (s.includes('PEND')) {
    return 'pending'
  }
  return 'unknown'
}

export async function fetchPosSaleDetail(salesOrderId: string): Promise<PosSaleDetail> {
  const tenantId = useAuthStore.getState().tenantId
  const cached = getLocalPosSaleHistory(tenantId, salesOrderId)

  let receiptText: string | undefined
  let receiptHtml: string | undefined
  let parsedSubtotal: number | undefined
  let parsedVat: number | undefined
  let lines = cached?.lines

  try {
    const receipt = await posReceipt(salesOrderId)
    receiptText = receipt.text
    receiptHtml = receipt.html
    const parsed = parsePosReceiptText(receipt.text)
    if (parsed) {
      parsedSubtotal = parsed.subtotal
      parsedVat = parsed.vat
      if (!lines?.length && parsed.lines.length) {
        lines = parsed.lines
      }
    }
  } catch (err) {
    if (!cached) {
      throw normalizeApiError(err)
    }
  }

  let efdStatus: PosSaleDetail['efdStatus'] = 'unknown'
  try {
    const ebmRows = await listEbmReceipts(undefined, 0, 50)
    const match = ebmRows.find(
      (r) => r.salesOrderId === salesOrderId || r.posTransactionId === salesOrderId,
    )
    if (match) {
      efdStatus = mapEfdStatus(match.status)
    }
  } catch {
    /* ignore */
  }

  if (cached) {
    return {
      ...cached,
      receiptText,
      receiptHtml,
      efdStatus,
      parsedSubtotal,
      parsedVat,
      lines,
    }
  }

  const parsed = receiptText ? parsePosReceiptText(receiptText) : null
  return {
    salesOrderId,
    receiptNumber: salesOrderId.slice(0, 8).toUpperCase(),
    createdAt: parsed?.createdAt ?? new Date().toISOString(),
    customerName: 'Walk-in',
    cashierId: '',
    registerCode: parsed?.registerCode,
    itemCount: parsed?.lines.length ?? 0,
    totalAmount: parsed?.total ?? 0,
    currencyCode: parsed?.currency ?? 'RWF',
    primaryTender: parsed?.tenders[0]?.type ?? '—',
    status: 'COMPLETED',
    tenders: (parsed?.tenders ?? []).map((t) => ({
      tenderType: 'CASH',
      amount: String(t.amount),
      reference: t.reference ?? null,
    })),
    lines: parsed?.lines,
    receiptText,
    receiptHtml,
    efdStatus,
    parsedSubtotal: parsed?.subtotal,
    parsedVat: parsed?.vat,
  }
}

export async function deliverPosReceipt(
  salesOrderId: string,
  body: { channel: 'WHATSAPP' | 'SMS'; phone: string; message?: string },
): Promise<{ ok: boolean; message: string }> {
  const { data } = await apiClient.post<{ ok: boolean; message: string }>(
    `/api/v1/pos/receipts/${salesOrderId}/deliver`,
    body,
  )
  return data
}

export { primaryTenderLabel }
