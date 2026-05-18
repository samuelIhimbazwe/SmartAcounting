import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { InvoiceLedgerRow } from '../../../shared/api/finance'

const HEADER = {
  current: 'bg-green-50 text-green-800',
  days1_30: 'bg-yellow-50 text-yellow-800',
  days31_60: 'bg-orange-50 text-orange-800',
  days61_90: 'bg-red-50 text-red-800',
  over90: 'bg-red-100 text-red-900 font-bold',
} as const

const CELL = {
  current: 'bg-green-50/40 text-green-900',
  days1_30: 'bg-yellow-50/40 text-yellow-900',
  days31_60: 'bg-orange-50/40 text-orange-900',
  days61_90: 'bg-red-50/40 text-red-900',
  over90: 'bg-red-100/50 text-red-950 font-medium',
} as const

export type AgingBucketKey = keyof typeof HEADER

function daysPastDue(dueDate: string | undefined | null): number | null {
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

function bucketForOutstanding(row: InvoiceLedgerRow): AgingBucketKey | null {
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

export type AgingRow = {
  customerKey: string
  customerId?: string
  customerName: string
  currencyCode: string
  current: number
  days1_30: number
  days31_60: number
  days61_90: number
  over90: number
}

function buildAgingRows(rows: InvoiceLedgerRow[]): AgingRow[] {
  const map = new Map<string, AgingRow>()
  for (const r of rows) {
    const bucket = bucketForOutstanding(r)
    if (!bucket) {
      continue
    }
    const key = `${r.customerName}||${r.currencyCode}`
    const outstanding = Number(r.outstandingAmount)
    const prev =
      map.get(key) ??
      ({
        customerKey: key,
        customerId: r.customerId,
        customerName: r.customerName,
        currencyCode: r.currencyCode,
        current: 0,
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        over90: 0,
      } as AgingRow)
    if (!prev.customerId && r.customerId) {
      prev.customerId = r.customerId
    }
    prev[bucket] += outstanding
    map.set(key, prev)
  }
  return [...map.values()].sort((a, b) => a.customerName.localeCompare(b.customerName))
}

function AgingTotalsRow({ rows }: { rows: AgingRow[] }) {
  const { t } = useTranslation()
  const totals = useMemo(() => {
    const z = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, all: 0 }
    for (const r of rows) {
      z.current += r.current
      z.days1_30 += r.days1_30
      z.days31_60 += r.days31_60
      z.days61_90 += r.days61_90
      z.over90 += r.over90
      z.all += r.current + r.days1_30 + r.days31_60 + r.days61_90 + r.over90
    }
    return z
  }, [rows])

  return (
    <tr className="border-t-2 border-neutral-300 font-semibold">
      <td className="px-2 py-2">{t('creditLedger.agingTotals')}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.current}`}>{totals.current.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.days1_30}`}>{totals.days1_30.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.days31_60}`}>{totals.days31_60.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.days61_90}`}>{totals.days61_90.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.over90}`}>{totals.over90.toFixed(2)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{totals.all.toFixed(2)}</td>
    </tr>
  )
}

function AgingDataCells({ row }: { row: AgingRow }) {
  const total = row.current + row.days1_30 + row.days31_60 + row.days61_90 + row.over90
  return (
    <>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.current}`}>{row.current.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.days1_30}`}>{row.days1_30.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.days31_60}`}>{row.days31_60.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.days61_90}`}>{row.days61_90.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${CELL.over90}`}>{row.over90.toFixed(2)}</td>
      <td className="px-2 py-2 text-right tabular-nums font-medium">{total.toFixed(2)}</td>
    </>
  )
}

export function ArAgingTable({ rows }: { rows: InvoiceLedgerRow[] }) {
  const { t } = useTranslation()
  const agingRows = useMemo(() => buildAgingRows(rows), [rows])

  return (
    <div className="overflow-auto">
      <table className="aging-table w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="border-b border-neutral-200 px-2 py-2">{t('creditLedger.customer')}</th>
            <th className={`border-b border-neutral-200 px-2 py-2 text-right ${HEADER.current}`}>{t('creditLedger.agingCurrent')}</th>
            <th className={`border-b border-neutral-200 px-2 py-2 text-right ${HEADER.days1_30}`}>{t('creditLedger.aging1_30')}</th>
            <th className={`border-b border-neutral-200 px-2 py-2 text-right ${HEADER.days31_60}`}>{t('creditLedger.aging31_60')}</th>
            <th className={`border-b border-neutral-200 px-2 py-2 text-right ${HEADER.days61_90}`}>{t('creditLedger.aging61_90')}</th>
            <th className={`border-b border-neutral-200 px-2 py-2 text-right ${HEADER.over90}`}>{t('creditLedger.aging90plus')}</th>
            <th className="border-b border-neutral-200 px-2 py-2 text-right">{t('creditLedger.agingTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {agingRows.map((row) => (
            <tr key={row.customerKey} className="border-b border-neutral-100">
              <td className="px-2 py-2">
                {row.customerId ? (
                  <Link className="font-medium text-[var(--color-brand-800)] hover:underline" to={`/finance/customers/${row.customerId}`}>
                    {row.customerName}
                  </Link>
                ) : (
                  row.customerName
                )}{' '}
                <span className="text-xs text-neutral-500">({row.currencyCode})</span>
              </td>
              <AgingDataCells row={row} />
            </tr>
          ))}
          {!agingRows.length && (
            <tr>
              <td colSpan={7} className="px-2 py-6 text-center text-neutral-500">
                {t('creditLedger.agingNone')}
              </td>
            </tr>
          )}
        </tbody>
        {agingRows.length > 0 && (
          <tfoot>
            <AgingTotalsRow rows={agingRows} />
          </tfoot>
        )}
      </table>
    </div>
  )
}
