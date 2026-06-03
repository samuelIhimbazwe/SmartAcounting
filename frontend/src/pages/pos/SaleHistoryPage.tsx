import { useCallback, useEffect, useMemo, useState } from 'react'
import { listPosSales, type PosSaleListRow } from '../../shared/api/posSales'
import { normalizeApiError } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/stores/authStore'
import { useAnyPermission } from '../../shared/hooks/usePermission'
import { Permission } from '../../shared/security/permissions'
import { formatRwf } from '../../utils/currency'
import { SaleDetailModal } from '../../components/pos/SaleDetailModal'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { Pagination } from '../../shared/components/ui/Pagination'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function toCsv(rows: PosSaleListRow[]): string {
  const header = ['Date', 'Receipt', 'Customer', 'Items', 'Total', 'Currency', 'Tender', 'Status', 'Sales order ID']
  const lines = rows.map((r) =>
    [
      r.createdAt,
      r.receiptNumber,
      r.customerName,
      String(r.itemCount),
      String(r.totalAmount),
      r.currencyCode,
      r.tender,
      r.status,
      r.salesOrderId,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export function SaleHistoryPage() {
  const userId = useAuthStore((s) => s.userId)
  const canViewAllCashiers = useAnyPermission([
    Permission.ANALYTICS_ALL,
    Permission.FINANCE_READ,
    Permission.POS_TILL_MANAGE,
  ])

  const [from, setFrom] = useState(todayIso())
  const [to, setTo] = useState(todayIso())
  const [search, setSearch] = useState('')
  const [cashierFilter, setCashierFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<PosSaleListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const effectiveCashierId = canViewAllCashiers ? cashierFilter || undefined : userId

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listPosSales({
        from,
        to,
        search,
        cashierId: effectiveCashierId,
        page,
        size: 25,
      })
      setRows(result.rows)
      setTotal(result.total)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [from, to, search, effectiveCashierId, page])

  useEffect(() => {
    void load()
  }, [load])

  const cashierOptions = useMemo(() => {
    const ids = new Set(rows.map((r) => r.cashierId).filter(Boolean))
    return [...ids]
  }, [rows])

  const pageCount = Math.max(1, Math.ceil(total / 25))

  const columns = useMemo((): DataTableColumn<PosSaleListRow>[] => [
    {
      key: 'createdAt',
      header: 'Date / time',
      render: v => new Date(String(v)).toLocaleString(),
    },
    {
      key: 'receiptNumber',
      header: 'Receipt #',
      render: v => <span className="font-mono text-xs">{String(v)}</span>,
    },
    { key: 'customerName', header: 'Customer' },
    {
      key: 'itemCount',
      header: 'Items',
      columnType: 'number',
      align: 'right',
      render: v => (v ? String(v) : '—'),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      columnType: 'currency',
      render: v => formatRwf(Number(v)),
    },
    { key: 'tender', header: 'Tender' },
    { key: 'status', header: 'Status', columnType: 'status' },
  ], [])

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pos-sales-${from}-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const emptyMessage =
    'No sales in this period. Complete a checkout on POS to see it here.'

  return (
    <div className="page-container space-y-4">
      <header className="page-header">
        <div>
          <h1 className="page-title">Sale history</h1>
          <p className="page-lead">POS receipts for the selected period.</p>
        </div>
      </header>

      <div className="filter-toolbar surface-card">
        <label>
          From
          <input
            type="date"
            className="ui-input"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(0)
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            className="ui-input"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(0)
            }}
          />
        </label>
        <label className="filter-toolbar__grow">
          Search
          <input
            className="ui-input"
            placeholder="Receipt # or customer"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </label>
        {canViewAllCashiers ? (
          <label>
            Cashier
            <select
              className="ui-input"
              value={cashierFilter}
              onChange={(e) => {
                setCashierFilter(e.target.value)
                setPage(0)
              }}
            >
              <option value="">All cashiers</option>
              {cashierOptions.map((id) => (
                <option key={id} value={id}>
                  {id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="filter-toolbar__actions">
          <Button type="button" size="sm" onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="table-mobile-only">
        {loading && !rows.length ? (
          <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
        ) : null}
        {!loading && !rows.length ? (
          <p className="surface-card py-8 text-center text-sm text-neutral-500">{emptyMessage}</p>
        ) : null}
        <ul className="data-cards" aria-label="Sale history">
          {rows.map((row) => (
            <li key={row.salesOrderId}>
              <button type="button" className="data-card" onClick={() => setSelectedId(row.salesOrderId)}>
                <div className="data-card__inner">
                  <div className="data-card__row">
                    <div className="min-w-0">
                      <div className="data-card__title">{row.customerName || 'Walk-in'}</div>
                      <div className="data-card__meta">
                        {new Date(row.createdAt).toLocaleString()} ·{' '}
                        <span className="font-mono">{row.receiptNumber}</span>
                      </div>
                    </div>
                    <div className="data-card__amount">{formatRwf(row.totalAmount)}</div>
                  </div>
                  <div className="data-card__footer">
                    <span className="data-card__pill">{row.tender}</span>
                    <span>{row.status}</span>
                    {row.itemCount ? <span>{row.itemCount} items</span> : null}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="table-desktop-only">
        <DataTable
          columns={columns}
          rows={rows}
          isLoading={loading}
          getRowKey={row => row.salesOrderId}
          onRowClick={row => setSelectedId(row.salesOrderId)}
          showSearch={false}
          showPagination={false}
          emptyStateLabel={emptyMessage}
          noResultsLabel={emptyMessage}
          exportFilename="pos-sale-history"
        />
      </div>

      <Pagination
        page={page + 1}
        totalPages={pageCount}
        totalItems={total}
        disabled={loading}
        onPageChange={(p) => setPage(p - 1)}
      />

      <SaleDetailModal salesOrderId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
