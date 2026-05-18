import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { InvoiceLedgerRow } from '../../../shared/api/finance'
import {
  INVOICE_KANBAN_STATUSES,
  KANBAN_STATUS_STYLE,
  groupInvoicesByKanban,
  totalsByKanban,
  type InvoiceKanbanStatus,
} from './invoiceKanban'

function KanbanColumn({
  status,
  invoices,
  total,
  onSelectCustomer,
  onOpenSettle,
  onToggleHistory,
}: {
  status: InvoiceKanbanStatus
  invoices: InvoiceLedgerRow[]
  total: number
  onSelectCustomer: (name: string) => void
  onOpenSettle: (row: InvoiceLedgerRow) => void
  onToggleHistory: (row: InvoiceLedgerRow) => void
}) {
  const { t } = useTranslation()
  const headerClass = KANBAN_STATUS_STYLE[status]

  return (
    <div className={`flex min-h-[220px] min-w-[200px] flex-1 flex-col rounded-xl border-2 ${headerClass}`}>
      <div className="flex items-center justify-between border-b border-black/5 px-2 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-neutral-800">{t(`creditLedger.kanban.${status}`)}</span>
        <span className="rounded-full bg-[var(--color-surface)]/80 px-2 py-0.5 font-[var(--font-display)] text-sm font-semibold tabular-nums text-neutral-900">
          {total}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {invoices.map((r) => (
          <div key={r.invoiceId} className="rounded-lg border border-black/10 bg-[var(--color-surface)] p-2 text-xs shadow-sm">
            {r.customerId ? (
              <Link
                to={`/finance/customers/${r.customerId}`}
                className="block w-full text-left font-medium text-[var(--color-brand-800)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {r.customerName}
              </Link>
            ) : (
              <button
                type="button"
                className="w-full text-left font-medium text-neutral-900 hover:underline"
                onClick={() => onSelectCustomer(r.customerName)}
              >
                {r.customerName}
              </button>
            )}
            <p className="m-0 mt-1 text-neutral-600">
              {r.outstandingAmount} {r.currencyCode} Â· {r.status}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-900 disabled:opacity-40"
                onClick={() => onOpenSettle(r)}
                disabled={Number(r.outstandingAmount) <= 0}
              >
                {t('creditLedger.settleNow')}
              </button>
              <button
                type="button"
                className="rounded border border-[var(--border-subtle)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px]"
                onClick={() => onToggleHistory(r)}
              >
                {t('creditLedger.history')}
              </button>
            </div>
          </div>
        ))}
        {!invoices.length && <p className="m-0 py-4 text-center text-[11px] text-neutral-500">{t('creditLedger.kanbanEmpty')}</p>}
      </div>
    </div>
  )
}

export function InvoiceKanbanBoard({
  rows,
  onSelectCustomer,
  onOpenSettle,
  onToggleHistory,
}: {
  rows: InvoiceLedgerRow[]
  onSelectCustomer: (name: string) => void
  onOpenSettle: (row: InvoiceLedgerRow) => void
  onToggleHistory: (row: InvoiceLedgerRow) => void
}) {
  const byStatus = groupInvoicesByKanban(rows)
  const totals = totalsByKanban(byStatus)

  return (
    <div className="kanban-board flex gap-3 overflow-x-auto pb-2">
      {INVOICE_KANBAN_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          invoices={byStatus[status]}
          total={totals[status]}
          onSelectCustomer={onSelectCustomer}
          onOpenSettle={onOpenSettle}
          onToggleHistory={onToggleHistory}
        />
      ))}
    </div>
  )
}
