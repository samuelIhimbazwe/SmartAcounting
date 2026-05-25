import type { PosTenderDto } from '../shared/api/pos'
import { useAuthStore } from '../shared/stores/authStore'

export interface PosSaleHistoryLine {
  product: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface PosSaleHistoryEntry {
  salesOrderId: string
  receiptNumber: string
  createdAt: string
  customerName: string
  cashierId: string
  registerCode?: string
  itemCount: number
  totalAmount: number
  currencyCode: string
  primaryTender: string
  status: 'COMPLETED' | 'OFFLINE_PENDING'
  tenders: PosTenderDto[]
  lines?: PosSaleHistoryLine[]
}

const STORAGE_KEY = 'smartchain_pos_sale_history_v1'
const MAX_ENTRIES = 500

function storageKey(tenantId: string): string {
  return `${STORAGE_KEY}:${tenantId}`
}

function readAll(tenantId: string): PosSaleHistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(tenantId))
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as PosSaleHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(tenantId: string, entries: PosSaleHistoryEntry[]): void {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(entries.slice(0, MAX_ENTRIES)))
}

export function appendPosSaleHistory(entry: Omit<PosSaleHistoryEntry, 'cashierId'> & { cashierId?: string }): void {
  const tenantId = useAuthStore.getState().tenantId
  const cashierId = entry.cashierId ?? useAuthStore.getState().userId
  const rows = readAll(tenantId).filter((r) => r.salesOrderId !== entry.salesOrderId)
  rows.unshift({ ...entry, cashierId })
  writeAll(tenantId, rows)
}

export function listLocalPosSaleHistory(tenantId: string): PosSaleHistoryEntry[] {
  return readAll(tenantId)
}

export function getLocalPosSaleHistory(tenantId: string, salesOrderId: string): PosSaleHistoryEntry | undefined {
  return readAll(tenantId).find((r) => r.salesOrderId === salesOrderId)
}

export function primaryTenderLabel(tenders: PosTenderDto[]): string {
  if (!tenders.length) {
    return '—'
  }
  const first = tenders[0]
  return formatTenderType(first.tenderType)
}

export function formatTenderType(type: string): string {
  switch (type) {
    case 'MOMO':
      return 'MoMo'
    case 'AIRTEL_MONEY':
      return 'Airtel Money'
    case 'ON_ACCOUNT':
      return 'On account'
    default:
      return type
  }
}
