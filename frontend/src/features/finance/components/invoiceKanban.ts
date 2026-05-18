import type { InvoiceLedgerRow } from '../../../shared/api/finance'

export const INVOICE_KANBAN_STATUSES = [
  'DRAFT',
  'POSTED',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'BAD_DEBT',
] as const

export type InvoiceKanbanStatus = (typeof INVOICE_KANBAN_STATUSES)[number]

export const KANBAN_STATUS_STYLE: Record<InvoiceKanbanStatus, string> = {
  DRAFT: 'border-neutral-300 bg-neutral-50',
  POSTED: 'border-blue-300 bg-blue-50',
  PARTIAL: 'border-orange-300 bg-orange-50',
  PAID: 'border-emerald-300 bg-emerald-50',
  OVERDUE: 'border-red-300 bg-red-50',
  BAD_DEBT: 'border-red-900/40 bg-red-950/10',
}

/** Map API row to a Kanban column using status, balances, and overdue flag only (no extra API data). */
export function invoiceKanbanColumn(row: InvoiceLedgerRow): InvoiceKanbanStatus {
  const st = (row.status || '').toUpperCase()
  const outstanding = Number(row.outstandingAmount)
  const applied = Number(row.appliedAmount)
  if (st.includes('BAD') || st.includes('DEBT') || st === 'WRITEOFF') {
    return 'BAD_DEBT'
  }
  if (st === 'DRAFT' || st === 'PENDING') {
    return 'DRAFT'
  }
  if (row.overdue && outstanding > 0) {
    return 'OVERDUE'
  }
  if (outstanding > 0 && applied > 0) {
    return 'PARTIAL'
  }
  if (outstanding <= 0) {
    return 'PAID'
  }
  return 'POSTED'
}

export function groupInvoicesByKanban(rows: InvoiceLedgerRow[]): Record<InvoiceKanbanStatus, InvoiceLedgerRow[]> {
  const empty = (): Record<InvoiceKanbanStatus, InvoiceLedgerRow[]> => ({
    DRAFT: [],
    POSTED: [],
    PARTIAL: [],
    PAID: [],
    OVERDUE: [],
    BAD_DEBT: [],
  })
  const map = empty()
  for (const row of rows) {
    const col = invoiceKanbanColumn(row)
    map[col].push(row)
  }
  return map
}

export function totalsByKanban(map: Record<InvoiceKanbanStatus, InvoiceLedgerRow[]>): Record<InvoiceKanbanStatus, number> {
  const out = {} as Record<InvoiceKanbanStatus, number>
  for (const k of INVOICE_KANBAN_STATUSES) {
    out[k] = map[k].length
  }
  return out
}
