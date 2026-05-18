import type { SupplierBillRow } from '../../../shared/api/financeExtended'

export const AP_KANBAN_STATUSES = ['DRAFT', 'POSTED', 'PARTIAL', 'PAID', 'OVERDUE'] as const
export type ApKanbanStatus = (typeof AP_KANBAN_STATUSES)[number]

export const AP_KANBAN_STYLE: Record<ApKanbanStatus, string> = {
  DRAFT: 'border-neutral-300 bg-neutral-50',
  POSTED: 'border-blue-300 bg-blue-50',
  PARTIAL: 'border-orange-300 bg-orange-50',
  PAID: 'border-emerald-300 bg-emerald-50',
  OVERDUE: 'border-red-300 bg-red-50',
}

/** Maps supplier bill API row to Kanban column (no BAD_DEBT column per AP spec). */
export function supplierBillKanbanColumn(row: SupplierBillRow): ApKanbanStatus {
  const st = (row.status || '').toUpperCase()
  const outstanding = Number(row.outstandingAmount)
  const applied = Number(row.appliedAmount)
  if (st === 'PAID' || outstanding <= 0) {
    return 'PAID'
  }
  if (row.overdue && outstanding > 0) {
    return 'OVERDUE'
  }
  if (applied > 0 && outstanding > 0) {
    return 'PARTIAL'
  }
  if (st === 'DRAFT' || st === 'PENDING') {
    return 'DRAFT'
  }
  return 'POSTED'
}

export function groupBillsByKanban(rows: SupplierBillRow[]): Record<ApKanbanStatus, SupplierBillRow[]> {
  const empty = (): Record<ApKanbanStatus, SupplierBillRow[]> => ({
    DRAFT: [],
    POSTED: [],
    PARTIAL: [],
    PAID: [],
    OVERDUE: [],
  })
  const map = empty()
  for (const row of rows) {
    map[supplierBillKanbanColumn(row)].push(row)
  }
  return map
}
