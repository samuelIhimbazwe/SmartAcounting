import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Plus } from 'lucide-react'
import {
  approvePaymentRun,
  createPaymentRun,
  executePaymentRun,
  listApprovedSupplierBills,
  listPaymentRuns,
  type PaymentRun,
} from '../../shared/api/productionFinance'
import type { SupplierBillRow } from '../../shared/api/financeExtended'
import { normalizeApiError } from '../../shared/api/errors'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

function statusBadge(status: string, t: (k: string) => string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    APPROVED: 'bg-amber-100 text-amber-800',
    POSTED: 'bg-emerald-100 text-emerald-800',
    FAILED: 'bg-red-100 text-red-800',
  }
  const label: Record<string, string> = {
    DRAFT: t('pages.paymentRuns.statusDraft'),
    APPROVED: t('pages.paymentRuns.statusApproved'),
    POSTED: t('pages.paymentRuns.statusPosted'),
    FAILED: t('pages.paymentRuns.statusFailed'),
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.DRAFT}`}>
      {label[status] ?? status}
    </span>
  )
}

export function PaymentRunsPage() {
  const { t } = useTranslation()
  const [runs, setRuns] = useState<PaymentRun[]>([])
  const [bills, setBills] = useState<SupplierBillRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [runData, billData] = await Promise.all([listPaymentRuns(), listApprovedSupplierBills()])
      setRuns(runData)
      setBills(billData)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onCreateRun() {
    setBusy(true)
    try {
      await createPaymentRun({
        fromDate,
        toDate,
        billStatus: 'APPROVED',
        currencyCode: 'RWF',
      })
      setDrawerOpen(false)
      await refresh()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  async function onPost(runId: string) {
    if (!window.confirm(t('pages.paymentRuns.confirmPost'))) return
    setBusy(true)
    try {
      await executePaymentRun(runId)
      await refresh()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('nav.paymentRuns')}</h1>
          <p className="text-sm text-slate-600">{t('pages.paymentRuns.subtitle')}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t('pages.paymentRuns.newRun')}
        </button>
      </header>

      {error ? (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" className="font-medium underline" onClick={() => void refresh()}>
            {t('pages.paymentRuns.retry')}
          </button>
        </div>
      ) : null}

      {runs.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-4" aria-hidden />
          <p className="text-slate-600 mb-4 max-w-md">{t('pages.paymentRuns.empty')}</p>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            {t('pages.paymentRuns.create')}
          </button>
        </div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">{t('common.status')}</th>
                <th className="px-4 py-2">{t('common.amount')}</th>
                <th className="px-4 py-2">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{statusBadge(run.status, t)}</td>
                  <td className="px-4 py-2">
                    {run.totalAmount} {run.currencyCode}
                  </td>
                  <td className="px-4 py-2 flex flex-wrap gap-2">
                    {run.status === 'DRAFT' ? (
                      <button
                        type="button"
                        className="text-indigo-600 hover:underline"
                        onClick={() => void approvePaymentRun(run.id).then(refresh)}
                      >
                        {t('pages.paymentRuns.approve')}
                      </button>
                    ) : null}
                    {run.status === 'APPROVED' ? (
                      <button
                        type="button"
                        className="text-indigo-600 hover:underline"
                        onClick={() => void onPost(run.id)}
                      >
                        {t('pages.paymentRuns.post')}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t('pages.paymentRuns.approvedBills')}</h2>
        {bills.length === 0 ? (
          <p className="text-sm text-slate-500">{t('common.empty')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {bills.map((b) => (
              <li key={b.supplierBillId} className="flex justify-between py-2 gap-4">
                <span className="truncate">{b.supplierName}</span>
                <span className="shrink-0">
                  {b.outstandingAmount} {b.currencyCode}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <aside className="w-full max-w-md bg-white shadow-xl p-6 space-y-4 h-full overflow-y-auto">
            <h2 className="text-lg font-semibold">{t('pages.paymentRuns.newRun')}</h2>
            <label className="block text-sm">
              From
              <input
                type="date"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              To
              <input
                type="date"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
            <p className="text-xs text-slate-500">
              {bills.length} approved bill{bills.length !== 1 ? 's' : ''} available
            </p>
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                className="flex-1 rounded-lg border px-4 py-2 text-sm"
                onClick={() => setDrawerOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void onCreateRun()}
              >
                {t('pages.paymentRuns.create')}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
