import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Table2, FileSpreadsheet } from 'lucide-react'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import type { ApAgingSupplierRow } from './supplierBills/apAging'
import {
  accountingApplyPayment,
  accountingCreatePayment,
  accountingListPaymentApplications,
} from '../../shared/api/finance'
import type { PaymentApplicationRow } from '../../shared/api/finance'
import {
  financeArchiveSupplierBill,
  financeListSupplierBills,
  dashboardQueueExport,
  type SupplierBillRow,
} from '../../shared/api/financeExtended'
import { accountingListUnmatched } from '../../shared/api/reconciliation'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { buildApAgingFromBills, apSummaryByCurrency } from './supplierBills/apAging'
import { AP_KANBAN_STATUSES, AP_KANBAN_STYLE, groupBillsByKanban } from './supplierBills/billKanban'

function money(n: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

function dueBadge(row: SupplierBillRow) {
  if (!row.dueDate) {
    return 'â€”'
  }
  const due = new Date(row.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (row.overdue) {
    return <span className="text-red-700">{Math.abs(diff)}d overdue</span>
  }
  return <span className="text-emerald-700">{diff}d until due</span>
}

export function SupplierBillsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'kanban' | 'aging'>('kanban')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [rows, setRows] = useState<SupplierBillRow[]>([])
  const [unmatched, setUnmatched] = useState<{ id: string; itemType: string; itemId: string; matched: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SupplierBillRow | null>(null)
  const [history, setHistory] = useState<PaymentApplicationRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [busyPay, setBusyPay] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [billData, um] = await Promise.all([
        financeListSupplierBills({
          status: statusFilter.trim() || undefined,
        }),
        accountingListUnmatched(0, 500),
      ])
      setRows(billData)
      setUnmatched(um.map((u) => ({ id: u.id, itemType: u.itemType, itemId: u.itemId, matched: u.matched })))
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openBill = useCallback(
    async (bill: SupplierBillRow) => {
      setSelected(bill)
      setHistory([])
      setHistoryLoading(true)
      try {
        const apps = await accountingListPaymentApplications({
          targetType: 'SUPPLIER_BILL',
          targetId: bill.supplierBillId,
        })
        setHistory(apps)
      } catch {
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    },
    [],
  )

  const matchNote = useCallback(
    (billId: string) => {
      const u = unmatched.find((x) => x.itemType === 'SUPPLIER_BILL' && x.itemId === billId && !x.matched)
      return u ? t('supplierBills.reconOpen') : t('supplierBills.reconClear')
    },
    [unmatched, t],
  )

  const markPaid = useCallback(async () => {
    if (!selected) {
      return
    }
    const owed = Number(selected.outstandingAmount)
    if (owed <= 0) {
      return
    }
    setBusyPay(true)
    setError(null)
    try {
      const pay = await accountingCreatePayment({
        direction: 'OUTGOING',
        counterparty: selected.supplierName,
        amount: owed.toFixed(2),
        currencyCode: selected.currencyCode,
      })
      await accountingApplyPayment({
        paymentId: pay.paymentId,
        targetType: 'SUPPLIER_BILL',
        targetId: selected.supplierBillId,
        appliedAmount: owed.toFixed(2),
      })
      setSelected(null)
      await refresh()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyPay(false)
    }
  }, [selected, refresh])

  const archiveBill = useCallback(async () => {
    if (!selected) {
      return
    }
    setBusyPay(true)
    setError(null)
    try {
      await financeArchiveSupplierBill(selected.supplierBillId)
      setSelected(null)
      await refresh()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyPay(false)
    }
  }, [selected, refresh])

  const exportCsv = useCallback(async () => {
    setExportBusy(true)
    try {
      const { exportJobId } = await dashboardQueueExport('cfo', 'csv')
      window.alert(t('supplierBills.exportQueued', { id: exportJobId }))
    } catch (e) {
      window.alert(normalizeApiError(e).message)
    } finally {
      setExportBusy(false)
    }
  }, [t])

  const agingRows = useMemo(() => buildApAgingFromBills(rows), [rows])
  const summarySplit = useMemo(() => apSummaryByCurrency(rows), [rows])
  const byKanban = useMemo(() => groupBillsByKanban(rows), [rows])

  const agingColumns = useMemo((): DataTableColumn<ApAgingSupplierRow>[] => [
    {
      key: 'supplierName',
      header: t('supplierBills.supplier'),
      render: (_v, row) => (
        <>
          <Link className="font-medium text-[var(--color-brand-800)] hover:underline" to={`/finance/suppliers/${row.supplierId}`}>
            {row.supplierName}
          </Link>
          <span className="text-xs text-neutral-500"> ({row.currencyCode})</span>
        </>
      ),
    },
    {
      key: 'current',
      header: t('creditLedger.agingCurrent'),
      align: 'right',
      sortable: false,
      render: (_v, row) => <span className="tabular-nums text-green-800">{money(row.current, row.currencyCode)}</span>,
    },
    {
      key: 'days1_30',
      header: t('creditLedger.aging1_30'),
      align: 'right',
      sortable: false,
      render: (_v, row) => <span className="tabular-nums text-yellow-800">{money(row.days1_30, row.currencyCode)}</span>,
    },
    {
      key: 'days31_60',
      header: t('creditLedger.aging31_60'),
      align: 'right',
      sortable: false,
      render: (_v, row) => <span className="tabular-nums text-orange-800">{money(row.days31_60, row.currencyCode)}</span>,
    },
    {
      key: 'days61_90',
      header: t('creditLedger.aging61_90'),
      align: 'right',
      sortable: false,
      render: (_v, row) => <span className="tabular-nums text-red-800">{money(row.days61_90, row.currencyCode)}</span>,
    },
    {
      key: 'over90',
      header: t('creditLedger.aging90plus'),
      align: 'right',
      sortable: false,
      render: (_v, row) => <span className="tabular-nums font-bold text-red-900">{money(row.over90, row.currencyCode)}</span>,
    },
    {
      key: 'supplierKey',
      header: t('creditLedger.agingTotal'),
      align: 'right',
      sortable: false,
      render: (_v, row) => {
        const total = row.current + row.days1_30 + row.days31_60 + row.days61_90 + row.over90
        return <span className="tabular-nums font-bold">{money(total, row.currencyCode)}</span>
      },
    },
  ], [t])

  if (loading) {
    return (
      <div className="p-4">
        <PageSkeleton rows={8} />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1">
      <header className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">{t('supplierBills.title')}</h1>
        <p className="m-0 text-sm text-neutral-600">{t('supplierBills.subtitle')}</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm ${
            tab === 'kanban' ? 'border-[var(--color-brand-300)] bg-[var(--color-brand-10)]' : 'border-transparent bg-[var(--color-surface)]'
          }`}
          onClick={() => setTab('kanban')}
        >
          <LayoutGrid className="h-4 w-4" />
          {t('supplierBills.tabKanban')}
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm ${
            tab === 'aging' ? 'border-[var(--color-brand-300)] bg-[var(--color-brand-10)]' : 'border-transparent bg-[var(--color-surface)]'
          }`}
          onClick={() => setTab('aging')}
        >
          <Table2 className="h-4 w-4" />
          {t('supplierBills.tabAging')}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4">
        <label className="text-sm">
          <span className="text-neutral-600">{t('supplierBills.statusFilter')}</span>
          <select
            className="mt-1 block rounded border px-2 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('supplierBills.allStatuses')}</option>
            <option value="OPEN">OPEN</option>
            <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
        </label>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm"
          onClick={() => void refresh()}
        >
          {t('creditLedger.refresh')}
        </button>
      </div>

      {tab === 'kanban' && (
        <section className="overflow-x-auto pb-2">
          {!rows.length ? (
            <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
              {t('supplierBills.emptyKanban')}
            </p>
          ) : (
            <div className="flex min-h-[280px] gap-3">
              {AP_KANBAN_STATUSES.map((col) => (
                <div
                  key={col}
                  className={`flex min-w-[220px] flex-1 flex-col rounded-xl border-2 ${AP_KANBAN_STYLE[col]}`}
                >
                  <div className="flex justify-between border-b border-black/5 px-2 py-2">
                    <span className="text-xs font-bold uppercase">{t(`supplierBills.kanban.${col}`)}</span>
                    <span className="font-semibold tabular-nums">{byKanban[col].length}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-2">
                    {byKanban[col].map((bill) => (
                      <button
                        key={bill.supplierBillId}
                        type="button"
                        onClick={() => void openBill(bill)}
                        className="rounded-lg border border-black/10 bg-[var(--color-surface)] p-2 text-left text-xs shadow-sm hover:border-[var(--color-brand-300)]"
                      >
                        <p className="m-0 font-semibold text-neutral-900">
                          <Link
                            to={`/finance/suppliers/${bill.supplierId}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bill.supplierName}
                          </Link>
                        </p>
                        <p className="m-0 mt-1 text-neutral-600">
                          {bill.reference.slice(0, 8)}â€¦ Â· {money(Number(bill.amount), bill.currencyCode)}
                        </p>
                        <p className="m-0 mt-1 text-neutral-500">
                          {bill.dueDate ? formatDate(bill.dueDate) : 'â€”'} Â· {dueBadge(bill)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'aging' && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-4 text-sm">
            {Object.entries(summarySplit).map(([cur, summary]) => (
              <div key={cur} className="flex flex-wrap gap-3 border-r border-neutral-200 pr-4 last:border-0">
                <div>
                  <span className="text-neutral-600">{t('supplierBills.totalAp')} ({cur}):</span>{' '}
                  <span className="font-semibold">{money(summary.totalOutstanding, cur)}</span>
                </div>
                <div>
                  <span className="text-neutral-600">{t('supplierBills.dueWeek')}:</span>{' '}
                  <span className="font-semibold">{money(summary.dueThisWeek, cur)}</span>
                </div>
                <div>
                  <span className="text-neutral-600">{t('supplierBills.overdueSum')}:</span>{' '}
                  <span className={`font-semibold ${summary.overdue > 0 ? 'text-red-700' : ''}`}>
                    {money(summary.overdue, cur)}
                  </span>
                </div>
              </div>
            ))}
            {!Object.keys(summarySplit).length && (
              <span className="text-neutral-500">{t('supplierBills.noOutstanding')}</span>
            )}
            <button
              type="button"
              disabled={exportBusy}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--color-surface)] px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => void exportCsv()}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exportBusy ? t('supplierBills.exporting') : t('supplierBills.exportCsv')}
            </button>
          </div>

          {!agingRows.length ? (
            <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
              {t('supplierBills.emptyAging')}
            </p>
          ) : (
            <DataTable
              columns={agingColumns}
              rows={agingRows}
              getRowKey={row => row.supplierKey}
              showSearch={false}
              showPagination={false}
              emptyStateLabel={t('supplierBills.emptyAging')}
              noResultsLabel={t('supplierBills.emptyAging')}
              exportFilename="supplier-ap-aging"
            />
          )}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="h-full w-full max-w-md overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4 shadow-xl">
            <div className="flex justify-between gap-2">
              <h2 className="mt-0 text-lg font-semibold">{t('supplierBills.detailTitle')}</h2>
              <button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => setSelected(null)}>
                {t('creditLedger.cancel')}
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-600">{t('supplierBills.supplier')}</dt>
                <dd className="m-0 font-medium">
                  <Link to={`/finance/suppliers/${selected.supplierId}`} className="text-[var(--color-brand-800)] hover:underline">
                    {selected.supplierName}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-600">{t('supplierBills.reference')}</dt>
                <dd className="m-0 font-mono text-xs">{selected.reference}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-600">{t('creditLedger.amount')}</dt>
                <dd className="m-0">{money(Number(selected.amount), selected.currencyCode)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-600">{t('creditLedger.outstanding')}</dt>
                <dd className="m-0 font-semibold">{money(Number(selected.outstandingAmount), selected.currencyCode)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-600">{t('creditLedger.status')}</dt>
                <dd className="m-0">{selected.status}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-600">{t('supplierBills.reconMatch')}</dt>
                <dd className="m-0">{matchNote(selected.supplierBillId)}</dd>
              </div>
            </dl>

            <h3 className="mt-6 text-sm font-semibold">{t('supplierBills.paymentHistory')}</h3>
            {historyLoading ? (
              <p className="text-sm text-neutral-500">{t('creditLedger.loadingHistory')}</p>
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {history.map((h) => (
                  <li key={h.applicationId} className="rounded border border-neutral-100 px-2 py-1 text-xs">
                    {formatDate(h.createdAt)} Â· {h.appliedAmount} {h.currencyCode ?? selected.currencyCode}
                  </li>
                ))}
                {!history.length && <li className="text-sm text-neutral-500">{t('creditLedger.noHistory')}</li>}
              </ul>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={busyPay || Number(selected.outstandingAmount) <= 0}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                onClick={() => void markPaid()}
              >
                {t('supplierBills.markPaid')}
              </button>
              <button
                type="button"
                disabled={busyPay}
                className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm"
                onClick={() => void archiveBill()}
              >
                {t('supplierBills.archive')}
              </button>
              <p className="text-xs text-neutral-500">{t('supplierBills.applyPaymentHint')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
