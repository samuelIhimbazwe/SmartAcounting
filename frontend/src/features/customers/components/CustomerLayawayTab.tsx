import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  cancelCustomerLayaway,
  collectCustomerLayaway,
  createCustomerLayaway,
  getCustomerLayaways,
  recordLayawayPayment,
  type LayawayOrderRow,
} from '../../../shared/api/customers'
import { normalizeApiError } from '../../../shared/api/errors'
import { formatDate } from '../../../shared/utils/intl'
import { Button } from '../../../shared/components/ui/Button'

function money(amount: unknown, currency = 'RWF') {
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function statusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return 'Active'
    case 'COLLECTED':
      return 'Collected'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

export interface CustomerLayawayTabProps {
  customerId: string
}

export function CustomerLayawayTab({ customerId }: CustomerLayawayTabProps) {
  const [rows, setRows] = useState<LayawayOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [collectionDate, setCollectionDate] = useState('')
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getCustomerLayaways(customerId, showAll ? undefined : 'OPEN'))
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [customerId, showAll])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const total = Number(totalAmount)
    const deposit = Number(depositAmount)
    if (!description.trim()) {
      setError('Describe what is being reserved.')
      return
    }
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(deposit) || deposit < 0) {
      setError('Enter valid total and deposit amounts.')
      return
    }
    const minDeposit = total * 0.3
    if (deposit < minDeposit) {
      setError(`Minimum deposit is 30% (${money(minDeposit)}).`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const cartJson = JSON.stringify([
        { name: description.trim(), qty: 1, lineTotal: total },
      ])
      await createCustomerLayaway(customerId, {
        totalAmount: total,
        depositAmount: deposit,
        currencyCode: 'RWF',
        cartJson,
        collectionDate: collectionDate || undefined,
      })
      setFormOpen(false)
      setDescription('')
      setTotalAmount('')
      setDepositAmount('')
      setCollectionDate('')
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function handlePayment(row: LayawayOrderRow) {
    const amount = Number(payAmounts[row.id] ?? '')
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid payment amount.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await recordLayawayPayment(customerId, row.id, { amount, tenderType: 'CASH' })
      setPayAmounts(prev => ({ ...prev, [row.id]: '' }))
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCollect(row: LayawayOrderRow) {
    setBusy(true)
    setError(null)
    try {
      await collectCustomerLayaway(customerId, row.id)
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel(row: LayawayOrderRow) {
    setBusy(true)
    setError(null)
    try {
      await cancelCustomerLayaway(customerId, row.id)
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading layaway orders…</p>
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-neutral-600">
          {showAll ? 'All layaway orders for this customer.' : 'Active layaway orders only.'}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show active only' : 'Show all orders'}
          </Button>
          <Button type="button" onClick={() => setFormOpen(v => !v)}>
            + New layaway
          </Button>
        </div>
      </div>

      {formOpen ? (
        <form className="max-w-md space-y-3 rounded-xl border bg-white p-4" onSubmit={e => void handleCreate(e)}>
          <h3 className="m-0 font-semibold text-neutral-900">Create layaway</h3>
          <label className="block text-sm">
            Items / description
            <textarea className="mt-1 w-full rounded border px-3 py-2" rows={2} value={description} onChange={e => setDescription(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Total (RWF)
            <input type="number" min={1} className="mt-1 w-full rounded border px-3 py-2" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Deposit paid now (RWF, min 30%)
            <input type="number" min={0} className="mt-1 w-full rounded border px-3 py-2" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Expected pickup date
            <input type="date" className="mt-1 w-full rounded border px-3 py-2" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create layaway'}</Button>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={busy}>Cancel</Button>
          </div>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
          {showAll ? 'No layaway orders recorded for this customer.' : 'No active layaway orders.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Deposit paid</th>
                <th className="px-3 py-2 font-medium">Remaining</th>
                <th className="px-3 py-2 font-medium">Expected pickup</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const balance = num(row.balanceDue)
                const isOpen = row.status.toUpperCase() === 'OPEN'
                return (
                  <tr key={row.id} className="border-t border-[var(--border-subtle)] align-top">
                    <td className="px-3 py-2">{row.createdAt ? formatDate(row.createdAt) : '—'}</td>
                    <td className="px-3 py-2">{statusLabel(row.status)}</td>
                    <td className="px-3 py-2">{money(row.totalAmount, row.currencyCode ?? 'RWF')}</td>
                    <td className="px-3 py-2">{money(row.depositAmount, row.currencyCode ?? 'RWF')}</td>
                    <td className="px-3 py-2 font-medium">{money(row.balanceDue, row.currencyCode ?? 'RWF')}</td>
                    <td className="px-3 py-2">{row.collectionDate ? formatDate(row.collectionDate) : '—'}</td>
                    <td className="px-3 py-2">
                      {isOpen ? (
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          {balance > 0.01 ? (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                min={0}
                                placeholder="Payment"
                                className="w-24 rounded border px-2 py-1 text-xs"
                                value={payAmounts[row.id] ?? ''}
                                onChange={e => setPayAmounts(prev => ({ ...prev, [row.id]: e.target.value }))}
                              />
                              <Button type="button" variant="ghost" disabled={busy} onClick={() => void handlePayment(row)}>
                                Pay
                              </Button>
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-1">
                            {balance <= 0.01 ? (
                              <Button type="button" disabled={busy} onClick={() => void handleCollect(row)}>
                                Mark collected
                              </Button>
                            ) : null}
                            <Button type="button" variant="ghost" disabled={busy} onClick={() => void handleCancel(row)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
