import type { SupplierBillRow } from '../../../shared/api/financeExtended'

export type ApAgingSupplierRow = {
  supplierKey: string
  supplierId: string
  supplierName: string
  currencyCode: string
  current: number
  days1_30: number
  days31_60: number
  days61_90: number
  over90: number
}

function daysPastDue(dueDate: string | null | undefined): number | null {
  if (!dueDate) {
    return null
  }
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) {
    return null
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000)
}

function bucketForOutstanding(row: SupplierBillRow): keyof Omit<ApAgingSupplierRow, 'supplierKey' | 'supplierId' | 'supplierName' | 'currencyCode'> | null {
  const outstanding = Number(row.outstandingAmount)
  if (outstanding <= 0) {
    return null
  }
  const days = daysPastDue(row.dueDate)
  if (days === null || days <= 0) {
    return 'current'
  }
  if (days <= 30) {
    return 'days1_30'
  }
  if (days <= 60) {
    return 'days31_60'
  }
  if (days <= 90) {
    return 'days61_90'
  }
  return 'over90'
}

export function buildApAgingFromBills(rows: SupplierBillRow[]): ApAgingSupplierRow[] {
  const map = new Map<string, ApAgingSupplierRow>()
  for (const r of rows) {
    const bucket = bucketForOutstanding(r)
    if (!bucket) {
      continue
    }
    const key = `${r.supplierId}||${r.currencyCode}`
    const outstanding = Number(r.outstandingAmount)
    const prev =
      map.get(key) ??
      ({
        supplierKey: key,
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        currencyCode: r.currencyCode,
        current: 0,
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        over90: 0,
      } as ApAgingSupplierRow)
    prev[bucket] += outstanding
    map.set(key, prev)
  }
  return [...map.values()].sort((a, b) => a.supplierName.localeCompare(b.supplierName))
}

export function apSummaryMetrics(rows: SupplierBillRow[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  let totalOutstanding = 0
  let dueThisWeek = 0
  let overdue = 0

  for (const r of rows) {
    const o = Number(r.outstandingAmount)
    if (o <= 0) {
      continue
    }
    totalOutstanding += o
    if (r.overdue) {
      overdue += o
      continue
    }
    if (r.dueDate) {
      const d = new Date(r.dueDate)
      d.setHours(0, 0, 0, 0)
      if (!Number.isNaN(d.getTime()) && d >= today && d <= weekEnd) {
        dueThisWeek += o
      }
    }
  }

  return { totalOutstanding, dueThisWeek, overdue }
}

export function apSummaryByCurrency(rows: SupplierBillRow[]): Record<
  string,
  { totalOutstanding: number; dueThisWeek: number; overdue: number }
> {
  const codes = [...new Set(rows.map((r) => r.currencyCode).filter(Boolean))]
  const out: Record<string, { totalOutstanding: number; dueThisWeek: number; overdue: number }> = {}
  for (const c of codes) {
    out[c] = apSummaryMetrics(rows.filter((r) => r.currencyCode === c))
  }
  return out
}
