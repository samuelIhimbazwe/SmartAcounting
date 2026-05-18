import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  accountingApplyPayment,
  accountingCreatePayment,
  accountingListPaymentApplications,
  financeListInvoices,
} from '../../shared/api/finance'
import {
  financeCustomerCreditStatus,
  financePatchCustomer,
  financePatchCustomerCreditLimit,
  type CustomerCreditStatus,
} from '../../shared/api/financeExtended'
import { FlowGuide } from '../../shared/components/ui/FlowGuide'
import { collectionsFlowGuide, resolveFlowGuideSteps } from '../../shared/content/flowGuides'
import type { InvoiceLedgerRow } from '../../shared/api/finance'
import { notificationsSmsDeliveries } from '../../shared/api/finance'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { useAuthStore } from '../../shared/stores/authStore'

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
  if (hr < 48) {
    return t('creditLedger.activityHoursAgo', { count: hr })
  }
  const day = Math.floor(hr / 24)
  return t('creditLedger.activityDaysAgo', { count: day })
}

function CreditBadge({ score }: { score: number }) {
  const level = score >= 0.75 ? 'critical' : score >= 0.4 ? 'warn' : 'ok'
  const cls =
    level === 'critical'
      ? 'bg-red-100 text-red-900'
      : level === 'warn'
        ? 'bg-amber-100 text-amber-900'
        : 'bg-emerald-100 text-emerald-900'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {level === 'critical' ? 'High risk' : level === 'warn' ? 'Watch' : 'OK'}
    </span>
  )
}

export function CustomerRecordPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const { t } = useTranslation()
  const sessionRole = useAuthStore((s) => s.role)
  const [credit, setCredit] = useState<CustomerCreditStatus | null>(null)
  const [invoices, setInvoices] = useState<InvoiceLedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payInvoice, setPayInvoice] = useState<InvoiceLedgerRow | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [busyPay, setBusyPay] = useState(false)
  const [editLimitOpen, setEditLimitOpen] = useState(false)
  const [limitDraft, setLimitDraft] = useState('')
  const [editPhoneOpen, setEditPhoneOpen] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const collectionsGuide = useMemo(() => resolveFlowGuideSteps(t, collectionsFlowGuide), [t])
  const [timeline, setTimeline] = useState<{ id: string; type: string; description: string; createdAt: string }[]>([])

  const canEditLimit = sessionRole === 'CFO' || sessionRole === 'ACCOUNTING'

  const load = useCallback(async () => {
    if (!customerId) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const cs = await financeCustomerCreditStatus(customerId)
      setCredit(cs)
      const inv = await financeListInvoices({ customerName: cs.customerName })
      setInvoices(inv)
      const acts: { id: string; type: string; description: string; createdAt: string }[] = []
      for (const invRow of inv.slice(0, 25)) {
        acts.push({
          id: `inv-${invRow.invoiceId}`,
          type: 'invoice_created',
          description: `${t('customerRecord.timelineInvoice')}: ${invRow.amount} ${invRow.currencyCode}`,
          createdAt: invRow.createdAt,
        })
        if (invRow.status?.toUpperCase().includes('BAD')) {
          acts.push({
            id: `bad-${invRow.invoiceId}`,
            type: 'bad_debt_flagged',
            description: t('customerRecord.timelineBadDebt'),
            createdAt: invRow.createdAt,
          })
        }
        try {
          const apps = await accountingListPaymentApplications({
            targetType: 'INVOICE',
            targetId: invRow.invoiceId,
          })
          for (const a of apps) {
            acts.push({
              id: `pay-${a.applicationId}`,
              type: 'payment_received',
              description: `${t('customerRecord.timelinePayment')}: ${a.appliedAmount}`,
              createdAt: a.createdAt,
            })
          }
        } catch {
          /* ignore */
        }
      }
      try {
        const sms = await notificationsSmsDeliveries({ page: 0, size: 200 })
        for (const s of sms.slice(0, 40)) {
          acts.push({
            id: `sms-${s.id}`,
            type: 'sms_reminder_sent',
            description: `${s.eventType} â†’ ${s.recipientPhone}`,
            createdAt: s.createdAt,
          })
        }
      } catch {
        /* optional */
      }
      acts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setTimeline(acts.slice(0, 80))
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [customerId, t])

  useEffect(() => {
    void load()
  }, [load])

  const invoiceCount = invoices.length
  const overdueCount = invoices.filter((i) => i.overdue && Number(i.outstandingAmount) > 0).length
  const paymentTouches = invoices.filter((i) => Number(i.appliedAmount) > 0).length

  const riskScore = credit ? Number(credit.badDebtRiskScore) : 0

  const saveLimit = async () => {
    if (!customerId || !limitDraft.trim()) {
      return
    }
    try {
      const updated = await financePatchCustomerCreditLimit(customerId, limitDraft.trim())
      setCredit(updated)
      setEditLimitOpen(false)
    } catch (e) {
      setError(normalizeApiError(e).message)
    }
  }

  const savePhone = async () => {
    if (!customerId) {
      return
    }
    try {
      const updated = await financePatchCustomer(customerId, { phone: phoneDraft.trim() })
      setCredit(updated)
      setEditPhoneOpen(false)
    } catch (e) {
      setError(normalizeApiError(e).message)
    }
  }

  const confirmPay = async () => {
    if (!payInvoice || !credit) {
      return
    }
    const max = Number(payInvoice.outstandingAmount)
    const n = Number(payAmount)
    if (n <= 0 || n > max) {
      return
    }
    setBusyPay(true)
    try {
      const pay = await accountingCreatePayment({
        direction: 'INCOMING',
        counterparty: credit.customerName,
        amount: n.toFixed(2),
        currencyCode: payInvoice.currencyCode,
      })
      await accountingApplyPayment({
        paymentId: pay.paymentId,
        targetType: 'INVOICE',
        targetId: payInvoice.invoiceId,
        appliedAmount: n.toFixed(2),
      })
      setPayInvoice(null)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyPay(false)
    }
  }

  const iconFor = (type: string) => {
    switch (type) {
      case 'invoice_created':
        return 'ðŸ“„'
      case 'payment_received':
        return 'ðŸ’°'
      case 'sms_reminder_sent':
        return 'ðŸ“±'
      case 'bad_debt_flagged':
        return 'âš ï¸'
      default:
        return 'â€¢'
    }
  }

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
    return <p className="p-4 text-neutral-600">{t('customerRecord.notFound')}</p>
  }

  const bal = Number(credit.currentBalance)
  const lim = Number(credit.creditLimit)
  const avail = Number(credit.availableCredit)

  return (
    <div className="space-y-6 p-1">
      <header className="record-header rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="record-title flex flex-wrap items-center gap-3">
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold">{credit.customerName}</h1>
          <CreditBadge score={riskScore} />
        </div>
        <div className="record-meta mt-2 flex flex-wrap gap-4 text-sm text-neutral-600">
          <span>ðŸ“± â€”</span>
          <span>ðŸ“§ â€”</span>
          <span>ðŸ“ â€”</span>
        </div>
      </header>

      <FlowGuide title={collectionsGuide.title} steps={collectionsGuide.steps} />

      <div className="smart-buttons flex flex-wrap gap-2">
        <Link
          to={`/finance/credit-ledger?customer=${encodeURIComponent(credit.customerName)}`}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm"
        >
          ðŸ“„ <span className="font-bold">{invoiceCount}</span> {t('creditLedger.smartInvoices')}
        </Link>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm">
          ðŸ’° <span className="font-bold">{paymentTouches}</span> {t('creditLedger.smartPayments')}
        </button>
        <Link to="/finance/sms-deliveries" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm">
          ðŸ“± <span className="font-bold">â€”</span> {t('creditLedger.smartSms')}
        </Link>
        <Link
          to={`/finance/credit-ledger?customer=${encodeURIComponent(credit.customerName)}&status=OVERDUE`}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm ${
            overdueCount > 0 ? 'border-red-300 bg-red-50 text-red-950' : ''
          }`}
        >
          âš ï¸ <span className="font-bold">{overdueCount}</span> {t('creditLedger.smartOverdue')}
        </Link>
        <Link to="/pos" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm">
          ðŸ›’ POS
        </Link>
      </div>

      <section className="credit-panel rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="credit-row flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-2">
          <span>{t('customerRecord.phone')}</span>
          <span className="font-mono text-sm">{credit.phone ?? '—'}</span>
          {canEditLimit && (
            <button
              type="button"
              className="text-sm text-[var(--color-brand-800)] underline"
              onClick={() => {
                setPhoneDraft(credit.phone ?? '')
                setEditPhoneOpen(true)
              }}
            >
              {t('customerRecord.editPhone')}
            </button>
          )}
        </div>
        <div className="credit-row flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-2">
          <span>{t('customerRecord.creditLimit')}</span>
          <span>{money(lim, invoices[0]?.currencyCode ?? 'USD')}</span>
          {canEditLimit && (
            <button
              type="button"
              className="text-sm text-[var(--color-brand-800)] underline"
              onClick={() => {
                setLimitDraft(String(credit.creditLimit ?? ''))
                setEditLimitOpen(true)
              }}
            >
              {t('customerRecord.editLimit')}
            </button>
          )}
        </div>
        <div className="credit-row flex justify-between gap-2 border-b border-neutral-100 py-2">
          <span>{t('customerRecord.outstanding')}</span>
          <span className={bal > 0 ? 'text-red-600' : ''}>{money(bal, invoices[0]?.currencyCode ?? 'USD')}</span>
        </div>
        <div className="credit-row flex justify-between gap-2 border-b border-neutral-100 py-2">
          <span>{t('customerRecord.available')}</span>
          <span className={avail <= 0 ? 'text-red-600' : 'text-emerald-600'}>
            {money(avail, invoices[0]?.currencyCode ?? 'USD')}
          </span>
        </div>
        <div className="credit-row flex justify-between gap-2 py-2">
          <span>{t('customerRecord.oldestOverdue')}</span>
          <span className="font-mono text-xs">{credit.oldestOverdueInvoiceId ?? t('customerRecord.none')}</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-[var(--color-brand-600)]"
            style={{ width: `${lim > 0 ? Math.min(100, (bal / lim) * 100) : 0}%` }}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t('customerRecord.invoicesTitle')}</h2>
        {!invoices.length ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-600">
            {t('customerRecord.noInvoices')}
          </p>
        ) : (
          <div className="overflow-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="py-2 pr-2">{t('customerRecord.colRef')}</th>
                  <th className="py-2 pr-2">{t('customerRecord.colDate')}</th>
                  <th className="py-2 pr-2">{t('customerRecord.colDue')}</th>
                  <th className="py-2 pr-2">{t('customerRecord.colAmount')}</th>
                  <th className="py-2 pr-2">{t('customerRecord.colStatus')}</th>
                  <th className="py-2">{t('customerRecord.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((row) => (
                  <tr key={row.invoiceId} className="border-b border-neutral-100">
                    <td className="py-2 pr-2 font-mono text-xs">{row.invoiceId.slice(0, 8)}â€¦</td>
                    <td className="py-2 pr-2">{formatDate(row.createdAt)}</td>
                    <td className="py-2 pr-2">{row.dueDate ? formatDate(row.dueDate) : 'â€”'}</td>
                    <td className="py-2 pr-2">
                      {row.amount} {row.currencyCode}
                    </td>
                    <td className="py-2 pr-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          row.overdue ? 'bg-red-100 text-red-800' : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        disabled={Number(row.outstandingAmount) <= 0}
                        className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs disabled:opacity-40"
                        onClick={() => {
                          setPayInvoice(row)
                          setPayAmount(Number(row.outstandingAmount).toFixed(2))
                        }}
                      >
                        {t('customerRecord.recordPayment')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="timeline rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('creditLedger.activityTitle')}</h2>
        {!timeline.length ? (
          <p className="text-sm text-neutral-500">{t('customerRecord.noActivity')}</p>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {timeline.map((a) => (
              <li key={a.id} className="flex gap-3 border-b border-neutral-100 pb-3 last:border-0">
                <span className="text-xl">{iconFor(a.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm text-neutral-800">{a.description}</p>
                  <p className="m-0 mt-1 text-xs text-neutral-500">{relTime(a.createdAt, t)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editPhoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-surface)] p-4 shadow-xl">
            <h3 className="mt-0 text-base font-semibold">{t('customerRecord.editPhoneTitle')}</h3>
            <p className="m-0 mt-1 text-xs text-neutral-600">{t('customerRecord.phoneHint')}</p>
            <input
              className="mt-2 w-full rounded border px-2 py-2 font-mono"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="+250788123456"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setEditPhoneOpen(false)}>
                {t('creditLedger.cancel')}
              </button>
              <button type="button" className="rounded bg-[var(--color-brand-700)] px-3 py-2 text-sm text-white" onClick={() => void savePhone()}>
                {t('creditLedger.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editLimitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-surface)] p-4 shadow-xl">
            <h3 className="mt-0 text-base font-semibold">{t('customerRecord.editLimitTitle')}</h3>
            <input
              className="mt-2 w-full rounded border px-2 py-2"
              value={limitDraft}
              onChange={(e) => setLimitDraft(e.target.value)}
              placeholder={String(lim)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setEditLimitOpen(false)}>
                {t('creditLedger.cancel')}
              </button>
              <button type="button" className="rounded bg-[var(--color-brand-700)] px-3 py-2 text-sm text-white" onClick={() => void saveLimit()}>
                {t('creditLedger.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {payInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-surface)] p-4 shadow-xl">
            <h3 className="mt-0 text-base font-semibold">{t('customerRecord.payTitle')}</h3>
            <input
              className="mt-2 w-full rounded border px-2 py-2 font-mono"
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setPayInvoice(null)}>
                {t('creditLedger.cancel')}
              </button>
              <button
                type="button"
                disabled={busyPay}
                className="rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void confirmPay()}
              >
                {t('creditLedger.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
