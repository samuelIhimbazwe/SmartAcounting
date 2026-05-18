import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

export function PaymentRunsPage() {
  const { t } = useTranslation()
  const [runs, setRuns] = useState<PaymentRun[]>([])
  const [bills, setBills] = useState<SupplierBillRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

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
        fromDate: today,
        toDate: today,
        billStatus: 'APPROVED',
        currencyCode: 'RWF',
      })
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
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('nav.paymentRuns')}</h1>
          <p className="text-sm text-slate-600">{t('pages.paymentRuns.subtitle')}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCreateRun()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {t('pages.paymentRuns.create')}
        </button>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t('pages.paymentRuns.approvedBills')}</h2>
        {bills.length === 0 ? (
          <p className="text-sm text-slate-500">{t('common.empty')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {bills.map((b) => (
              <li key={b.supplierBillId} className="flex justify-between py-2">
                <span>{b.supplierName}</span>
                <span>
                  {b.outstandingAmount} {b.currencyCode}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
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
                <td className="px-4 py-2">{run.status}</td>
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
                      onClick={() => void executePaymentRun(run.id).then(refresh)}
                    >
                      {t('pages.paymentRuns.post')}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 ? <p className="p-4 text-sm text-slate-500">{t('common.empty')}</p> : null}
      </section>
    </div>
  )
}

