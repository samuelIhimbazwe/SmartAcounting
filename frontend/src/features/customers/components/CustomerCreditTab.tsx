import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/DataTable'
import {
  getCustomer,
  getCustomerCredit,
  recordCustomerPayment,
  type CustomerCreditLine,
  type CustomerSummary,
} from '../../../shared/api/customers'
import { financeListInvoices, type InvoiceLedgerRow } from '../../../shared/api/finance'
import { normalizeApiError } from '../../../shared/api/errors'
import { formatDate } from '../../../shared/utils/intl'
import { Button } from '../../../shared/components/ui/Button'

function moneyRwf(amount: number) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(
    amount,
  )
}

function invoiceAmount(row: InvoiceLedgerRow): number {
  const n = typeof row.amount === 'number' ? row.amount : Number(row.amount)
  return Number.isFinite(n) ? n : 0
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

function whatsAppReminderUrl(phone: string, customerName: string, amount: number) {
  const digits = phone.replace(/\D/g, '')
  const intl = digits.startsWith('250') ? digits : digits.startsWith('0') ? `250${digits.slice(1)}` : `250${digits}`
  const text = `Hello ${customerName}, this is a friendly reminder about your outstanding balance of ${moneyRwf(amount)}. Please contact us to arrange payment.`
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
}

export interface CustomerCreditTabProps {
  customer: CustomerSummary
  canWrite?: boolean
  onCustomerUpdated: (c: CustomerSummary) => void
}

export function CustomerCreditTab({ customer, canWrite = true, onCustomerUpdated }: CustomerCreditTabProps) {
  const [creditLines, setCreditLines] = useState<CustomerCreditLine[]>([])
  const [invoices, setInvoices] = useState<InvoiceLedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [credit, inv] = await Promise.all([
        getCustomerCredit(customer.id),
        financeListInvoices({ customerName: customer.name }),
      ])
      setCreditLines(credit)
      setInvoices(inv)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [customer.id, customer.name])

  useEffect(() => {
    void load()
  }, [load])

  async function handlePayment(e: FormEvent) {
    e.preventDefault()
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid payment amount.')
      return
    }
    if (amount > balance) {
      setError(`Payment cannot exceed the outstanding balance of ${moneyRwf(balance)}.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await recordCustomerPayment(customer.id, { amount, notes: payNotes.trim() || undefined })
      const refreshed = await getCustomer(customer.id)
      onCustomerUpdated(refreshed)
      setPayOpen(false)
      setPayAmount('')
      setPayNotes('')
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  const balance = Number(customer.creditBalance ?? 0)

  const invoiceColumns = useMemo((): DataTableColumn<InvoiceLedgerRow>[] => [
    {
      key: 'invoiceId',
      header: 'Invoice',
      render: v => <span className="font-mono text-xs">{String(v).slice(0, 8)}…</span>,
    },
    {
      key: 'dueDate',
      header: 'Due',
      columnType: 'date',
      render: v => (v ? formatDate(String(v)) : '—'),
    },
    {
      key: 'amount',
      header: 'Amount',
      columnType: 'currency',
      render: (_v, row) => moneyRwf(invoiceAmount(row)),
    },
    {
      key: 'status',
      header: 'Status',
      columnType: 'status',
      render: (_v, row) => (row.overdue || isOverdue(row.dueDate) ? 'Overdue' : (row.status ?? 'Open')),
      statusVariant: (_v, row) => (row.overdue || isOverdue(row.dueDate) ? 'error' : 'neutral'),
    },
  ], [])

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading credit information…</p>
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {canWrite ? (
          <Button type="button" onClick={() => setPayOpen(v => !v)} disabled={balance <= 0}>
            Record payment
          </Button>
        ) : null}
        {customer.phone ? (
          <a
            href={whatsAppReminderUrl(customer.phone, customer.name, balance)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
          >
            <Button type="button" variant="ghost">
              Send WhatsApp reminder
            </Button>
          </a>
        ) : (
          <Button type="button" variant="ghost" disabled>
            Send WhatsApp reminder
          </Button>
        )}
      </div>

      {payOpen ? (
        <form className="max-w-md space-y-3 rounded-xl border bg-white p-4" onSubmit={e => void handlePayment(e)}>
          <h3 className="font-semibold text-neutral-900">Record payment</h3>
          <label className="block text-sm">
            Amount (RWF)
            <input
              type="number"
              min={0}
              step="1"
              className="mt-1 w-full rounded border px-3 py-2"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Notes
            <input className="mt-1 w-full rounded border px-3 py-2" value={payNotes} onChange={e => setPayNotes(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Apply payment'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-800">Outstanding invoices</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-neutral-500">No open invoices for this customer.</p>
        ) : (
          <DataTable
            columns={invoiceColumns}
            rows={invoices}
            getRowKey={row => row.invoiceId}
            showSearch={false}
            emptyStateLabel="No open invoices for this customer"
            noResultsLabel="No invoices match your search"
          />
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-800">Credit ledger</h3>
        {creditLines.length === 0 ? (
          <p className="text-sm text-neutral-500">No credit statement lines.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {creditLines.map((line, i) => (
              <li key={i} className="flex justify-between gap-4 rounded border px-3 py-2">
                <span>
                  {line.description ?? line.type ?? 'Entry'}
                  {line.createdAt ? (
                    <span className="ml-2 text-xs text-neutral-500">{formatDate(line.createdAt)}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-medium">{moneyRwf(Number(line.amount ?? 0))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
