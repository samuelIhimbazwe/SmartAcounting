import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { InvoiceLedgerRow } from '../../../shared/api/finance'
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/DataTable'

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

function agingCell(value: number, bucket: AgingBucketKey) {
  return (
    <span className={`inline-block w-full px-2 py-2 text-right tabular-nums ${CELL[bucket]}`}>
      {value.toFixed(2)}
    </span>
  )
}

function AgingTotalsFooter({ rows }: { rows: AgingRow[] }) {
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
    <div
      className="aging-totals grid w-full min-w-[720px] grid-cols-7 border-t-2 border-neutral-300 text-left text-sm font-semibold"
      role="row"
      aria-label={t('creditLedger.agingTotals')}
    >
      <div className="px-2 py-2">{t('creditLedger.agingTotals')}</div>
      <div className={`px-2 py-2 text-right tabular-nums ${CELL.current}`}>{totals.current.toFixed(2)}</div>
      <div className={`px-2 py-2 text-right tabular-nums ${CELL.days1_30}`}>{totals.days1_30.toFixed(2)}</div>
      <div className={`px-2 py-2 text-right tabular-nums ${CELL.days31_60}`}>{totals.days31_60.toFixed(2)}</div>
      <div className={`px-2 py-2 text-right tabular-nums ${CELL.days61_90}`}>{totals.days61_90.toFixed(2)}</div>
      <div className={`px-2 py-2 text-right tabular-nums ${CELL.over90}`}>{totals.over90.toFixed(2)}</div>
      <div className="px-2 py-2 text-right tabular-nums">{totals.all.toFixed(2)}</div>
    </div>
  )
}

export function ArAgingTable({ rows }: { rows: InvoiceLedgerRow[] }) {
  const { t } = useTranslation()
  const agingRows = useMemo(() => buildAgingRows(rows), [rows])

  const columns = useMemo((): DataTableColumn<AgingRow>[] => {
    const bucketHeader = (key: AgingBucketKey, label: string) => (
      <span className={`inline-block w-full px-2 py-2 text-right ${HEADER[key]}`}>{label}</span>
    )
    return [
      {
        key: 'customerName',
        header: t('creditLedger.customer'),
        render: (_v, row) => (
          <>
            {row.customerId ? (
              <Link
                className="font-medium text-[var(--color-brand-800)] hover:underline"
                to={`/finance/customers/${row.customerId}`}
              >
                {row.customerName}
              </Link>
            ) : (
              row.customerName
            )}{' '}
            <span className="text-xs text-neutral-500">({row.currencyCode})</span>
          </>
        ),
      },
      {
        key: 'current',
        header: bucketHeader('current', t('creditLedger.agingCurrent')) as unknown as string,
        align: 'right',
        sortable: false,
        render: v => agingCell(Number(v), 'current'),
      },
      {
        key: 'days1_30',
        header: bucketHeader('days1_30', t('creditLedger.aging1_30')) as unknown as string,
        align: 'right',
        sortable: false,
        render: v => agingCell(Number(v), 'days1_30'),
      },
      {
        key: 'days31_60',
        header: bucketHeader('days31_60', t('creditLedger.aging31_60')) as unknown as string,
        align: 'right',
        sortable: false,
        render: v => agingCell(Number(v), 'days31_60'),
      },
      {
        key: 'days61_90',
        header: bucketHeader('days61_90', t('creditLedger.aging61_90')) as unknown as string,
        align: 'right',
        sortable: false,
        render: v => agingCell(Number(v), 'days61_90'),
      },
      {
        key: 'over90',
        header: bucketHeader('over90', t('creditLedger.aging90plus')) as unknown as string,
        align: 'right',
        sortable: false,
        render: v => agingCell(Number(v), 'over90'),
      },
      {
        key: 'customerKey',
        header: t('creditLedger.agingTotal'),
        align: 'right',
        sortable: false,
        render: (_v, row) => {
          const total = row.current + row.days1_30 + row.days31_60 + row.days61_90 + row.over90
          return <span className="px-2 py-2 text-right tabular-nums font-medium">{total.toFixed(2)}</span>
        },
      },
    ]
  }, [t])

  return (
    <div className="space-y-0">
      <DataTable
        columns={columns}
        rows={agingRows}
        getRowKey={row => row.customerKey}
        showSearch={false}
        showPagination={false}
        emptyStateLabel={t('creditLedger.agingNone')}
        noResultsLabel={t('creditLedger.agingNone')}
        tableAriaLabel={t('creditLedger.customer')}
      />
      {agingRows.length > 0 ? <AgingTotalsFooter rows={agingRows} /> : null}
    </div>
  )
}
