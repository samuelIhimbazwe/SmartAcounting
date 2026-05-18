import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { InvoiceLedgerRow, PaymentApplicationRow } from '../../../shared/api/finance'

type ActivityType = 'INVOICE' | 'PAYMENT' | 'BAD_DEBT'

const ICON: Record<ActivityType, string> = {
  INVOICE: 'ðŸ“„',
  PAYMENT: 'ðŸ’°',
  BAD_DEBT: 'âš ï¸',
}

interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  createdAt: string
}

function formatRelativeTime(iso: string, t: (k: string, v?: Record<string, unknown>) => string): string {
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

function buildActivities(
  customerName: string,
  rows: InvoiceLedgerRow[],
  historyByInvoiceId: Record<string, PaymentApplicationRow[]>,
  t: (k: string, v?: Record<string, unknown>) => string,
): ActivityItem[] {
  const trimmed = customerName.trim()
  if (!trimmed) {
    return []
  }
  const mine = rows.filter((r) => r.customerName === trimmed)
  const items: ActivityItem[] = []
  for (const r of mine) {
    const st = (r.status || '').toUpperCase()
    if (st.includes('BAD') || st.includes('DEBT')) {
      items.push({
        id: `bad-${r.invoiceId}`,
        type: 'BAD_DEBT',
        description: t('creditLedger.activityBadDebt', { id: r.invoiceId }),
        createdAt: r.createdAt,
      })
    }
    items.push({
      id: `inv-${r.invoiceId}`,
      type: 'INVOICE',
      description: t('creditLedger.activityInvoice', {
        amount: r.amount,
        cur: r.currencyCode,
        status: r.status,
      }),
      createdAt: r.createdAt,
    })
    for (const h of historyByInvoiceId[r.invoiceId] ?? []) {
      items.push({
        id: `pay-${h.applicationId}`,
        type: 'PAYMENT',
        description: t('creditLedger.activityPayment', {
          amount: h.appliedAmount,
          cur: h.currencyCode ?? r.currencyCode,
        }),
        createdAt: h.createdAt,
      })
    }
  }
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return items.slice(0, 80)
}

export function CustomerActivityTimeline({
  customerName,
  rows,
  historyByInvoiceId,
}: {
  customerName: string
  rows: InvoiceLedgerRow[]
  historyByInvoiceId: Record<string, PaymentApplicationRow[]>
}) {
  const { t } = useTranslation()
  const activities = useMemo(
    () => buildActivities(customerName, rows, historyByInvoiceId, t),
    [customerName, rows, historyByInvoiceId, t],
  )

  if (!customerName.trim() || !activities.length) {
    return null
  }

  return (
    <div className="activity-timeline rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
      <h3 className="mt-0 text-base font-semibold text-neutral-900">{t('creditLedger.activityTitle')}</h3>
      <ul className="m-0 list-none space-y-3 p-0">
        {activities.map((activity) => (
          <li key={activity.id} className="activity-item flex gap-3 border-b border-neutral-100 pb-3 last:border-0">
            <span className="activity-icon text-xl">{ICON[activity.type]}</span>
            <div className="activity-content min-w-0 flex-1">
              <p className="m-0 text-sm text-neutral-800">{activity.description}</p>
              <p className="m-0 mt-1 text-xs text-neutral-500">{formatRelativeTime(activity.createdAt, t)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
