import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { InvoiceLedgerRow, PaymentApplicationRow } from '../../../shared/api/finance'

function SmartButton({
  icon,
  count,
  label,
  to,
  urgent,
}: {
  icon: string
  count: number
  label: string
  to: string
  urgent?: boolean
}) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
        urgent ? 'border-red-300 bg-red-50 text-red-950' : 'border-[var(--border-default)] bg-[var(--color-surface)] text-neutral-800'
      }`}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span className="font-[var(--font-display)] text-xl font-bold tabular-nums">{count}</span>
      <span className="max-w-[9rem] leading-tight">{label}</span>
    </button>
  )
}

export function CustomerSmartButtons({
  customerName,
  rows,
  historyByInvoiceId,
}: {
  customerName: string
  rows: InvoiceLedgerRow[]
  historyByInvoiceId: Record<string, PaymentApplicationRow[]>
}) {
  const { t } = useTranslation()
  const trimmed = customerName.trim()
  const mine = trimmed ? rows.filter((r) => r.customerName === trimmed) : []
  const invoiceCount = mine.length
  let paymentApps = 0
  for (const r of mine) {
    paymentApps += (historyByInvoiceId[r.invoiceId] ?? []).length
  }
  const paymentCandidates = mine.filter((r) => Number(r.appliedAmount) > 0).length
  const paymentCount = Math.max(paymentApps, paymentCandidates)
  const overdueCount = mine.filter((r) => r.overdue && Number(r.outstandingAmount) > 0).length
  const enc = encodeURIComponent(trimmed)
  const profileCustomerId = mine.find((r) => r.customerId)?.customerId

  if (!trimmed || !mine.length) {
    return null
  }

  return (
    <div className="smart-buttons flex flex-wrap gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-3">
      <p className="m-0 w-full text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('creditLedger.smartButtonsTitle')}</p>
      <SmartButton
        icon="ðŸ“„"
        count={invoiceCount}
        label={t('creditLedger.smartInvoices')}
        to={profileCustomerId ? `/finance/customers/${profileCustomerId}` : `/finance/credit-ledger?customer=${enc}&view=table`}
      />
      <SmartButton
        icon="ðŸ’°"
        count={paymentCount}
        label={t('creditLedger.smartPayments')}
        to={`/finance/credit-ledger?customer=${enc}&view=table`}
      />
      <SmartButton
        icon="ðŸ“±"
        count={0}
        label={t('creditLedger.smartSms')}
        to="/finance/sms-deliveries"
      />
      <SmartButton
        icon="âš ï¸"
        count={overdueCount}
        label={t('creditLedger.smartOverdue')}
        to={`/finance/credit-ledger?customer=${enc}&status=OVERDUE&view=table`}
        urgent={overdueCount > 0}
      />
    </div>
  )
}
