import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { accountingListPaymentApplications } from '../../shared/api/finance'
import { financeListSupplierBills, financeSupplierCreditStatus, type SupplierCreditStatus, type SupplierBillRow } from '../../shared/api/financeExtended'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { StatementReconciliationModal } from './components/StatementReconciliationModal'

function money(n: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

function relTime(iso: string, t: (k: string, v?: Record<string, unknown>) => string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return iso
  }
  const sec = Math.floor((Date.now() - then) / 1000)
  if (sec < 60) {
    return t('creditLedger.activityJustNow')
  }
  const min = Math.floor(sec / 60)
  if (min < 60) {
    return t('creditLedger.activityMinutesAgo', { count: min })
  }
  const hr = Math.floor(min / 60)
  return t('creditLedger.activityHoursAgo', { count: hr })
}

export function SupplierRecordPage() {
  const { supplierId } = useParams<{ supplierId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [credit, setCredit] = useState<SupplierCreditStatus | null>(null)
  const [bills, setBills] = useState<SupplierBillRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statementOpen, setStatementOpen] = useState(false)
  const [timeline, setTimeline] = useState<{ id: string; type: string; description: string; createdAt: string }[]>([])

  const load = useCallback(async () => {
    if (!supplierId) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const cs = await financeSupplierCreditStatus(supplierId)
      setCredit(cs)
      const billRows = await financeListSupplierBills({ supplierName: cs.supplierName })
      const mine = billRows.filter((b) => b.supplierId === supplierId)
      setBills(mine)
      const acts: { id: string; type: string; description: string; createdAt: string }[] = []
      for (const b of mine.slice(0, 25)) {
        acts.push({
          id: `bill-${b.supplierBillId}`,
          type: 'bill',
          description: `${t('supplierRecord.timelineBill')}: ${b.amount} ${b.currencyCode}`,
          createdAt: b.createdAt,
        })
        try {
          const apps = await accountingListPaymentApplications({
            targetType: 'SUPPLIER_BILL',
            targetId: b.supplierBillId,
          })
          for (const a of apps) {
            acts.push({
              id: `pay-${a.applicationId}`,
              type: 'payment',
              description: `${t('supplierRecord.timelinePayment')}: ${a.appliedAmount}`,
              createdAt: a.createdAt,
            })
          }
        } catch {
          /* ignore */
        }
      }
      acts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setTimeline(acts.slice(0, 80))
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [supplierId, t])

  useEffect(() => {
    void load()
  }, [load])

  const billCount = bills.length
  const paymentCount = bills.filter((b) => Number(b.appliedAmount) > 0).length
  const nextDue = credit?.nextDueDate ? new Date(credit.nextDueDate) : null
  const isPastDue =
    nextDue &&
    !Number.isNaN(nextDue.getTime()) &&
    nextDue < new Date(new Date().toDateString()) &&
    Number(credit?.totalOutstanding ?? 0) > 0

  if (loading && !credit) {
    return (
      <div className="p-4">
        <PageSkeleton rows={10} />
      </div>
    )
  }

  if (error && !credit) {
    return (
      <div className="p-4">
        <p className="text-red-700">{error}</p>
        <button type="button" className="mt-2 rounded border px-3 py-2 text-sm" onClick={() => void load()}>
          {t('dashboard.retry')}
        </button>
      </div>
    )
  }

  if (!credit) {
    return <p className="p-4 text-neutral-600">{t('supplierRecord.notFound')}</p>
  }

  const cur = bills[0]?.currencyCode ?? 'USD'
  const out = Number(credit.totalOutstanding)
  const lim = Number(credit.creditLimit)
  const avail = Number(credit.availableCredit)

  const billColumns = useMemo((): DataTableColumn<SupplierBillRow>[] => [
    {
      key: 'reference',
      header: t('supplierBills.reference'),
      render: v => <span className="font-mono text-xs">{String(v).slice(0, 8)}…</span>,
    },
    {
      key: 'amount',
      header: t('creditLedger.amount'),
      render: (_v, b) => `${b.amount} ${b.currencyCode}`,
    },
    { key: 'outstandingAmount', header: t('creditLedger.outstanding') },
    {
      key: 'dueDate',
      header: t('creditLedger.dueDate'),
      columnType: 'date',
      render: v => (v ? formatDate(String(v)) : '—'),
    },
    { key: 'status', header: t('creditLedger.status'), columnType: 'status' },
  ], [t])

  return (
    <div className="space-y-6 p-1">
      <header className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold">{credit.supplierName}</h1>
        <p className="m-0 mt-1 text-sm text-neutral-600">
          {t('supplierRecord.contactPlaceholder')} Â· {t('supplierRecord.terms')}: {credit.paymentTermsDays}{' '}
          {t('supplierRecord.days')}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm"
          onClick={() => navigate(`/finance/supplier-bills`)}
        >
          ðŸ“„ <span className="font-bold">{billCount}</span> {t('supplierRecord.bills')}
        </button>
        <span className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm">
          ðŸ’° <span className="font-bold">{paymentCount}</span> {t('supplierRecord.payments')}
        </span>
        <Link to="/transactions/purchase-order" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm">
          ðŸ“¦ {t('supplierRecord.po')}
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-300)] px-3 py-2 text-sm shadow-sm"
          onClick={() => setStatementOpen(true)}
        >
          âš–ï¸ {t('supplierRecord.reconcile')}
        </button>
      </div>

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="flex justify-between border-b border-neutral-100 py-2 text-sm">
          <span>{t('supplierRecord.creditLimit')}</span>
          <span>{money(lim, cur)}</span>
        </div>
        <div className="flex justify-between border-b border-neutral-100 py-2 text-sm">
          <span>{t('supplierRecord.totalOutstanding')}</span>
          <span>{money(out, cur)}</span>
        </div>
        <div className="flex justify-between border-b border-neutral-100 py-2 text-sm">
          <span>{t('supplierRecord.availableCredit')}</span>
          <span className={avail <= 0 ? 'text-red-600' : ''}>{money(avail, cur)}</span>
        </div>
        <div className="flex justify-between py-2 text-sm">
          <span>{t('supplierRecord.nextDue')}</span>
          <span className={isPastDue ? 'text-red-600' : ''}>
            {credit.nextDueDate ? formatDate(credit.nextDueDate) : 'â€”'}
          </span>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t('supplierRecord.billsTitle')}</h2>
        {!bills.length ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-600">
            {t('supplierRecord.noBills')}
          </p>
        ) : (
          <DataTable
            columns={billColumns}
            rows={bills}
            isLoading={loading}
            getRowKey={row => row.supplierBillId}
            showSearch={false}
            emptyStateLabel={t('supplierRecord.noBills')}
            noResultsLabel={t('supplierRecord.noBills')}
          />
        )}
      </section>

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('creditLedger.activityTitle')}</h2>
        {!timeline.length ? (
          <p className="text-sm text-neutral-500">{t('supplierRecord.noActivity')}</p>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {timeline.map((a) => (
              <li key={a.id} className="flex gap-3 border-b border-neutral-100 pb-3 last:border-0">
                <span className="text-xl">{a.type === 'payment' ? 'ðŸ’°' : 'ðŸ“„'}</span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm text-neutral-800">{a.description}</p>
                  <p className="m-0 mt-1 text-xs text-neutral-500">{relTime(a.createdAt, t)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {statementOpen && supplierId && (
        <StatementReconciliationModal supplierId={supplierId} onClose={() => setStatementOpen(false)} />
      )}
    </div>
  )
}
