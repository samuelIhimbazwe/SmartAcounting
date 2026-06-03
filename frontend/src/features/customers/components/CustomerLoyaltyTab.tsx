import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/DataTable'
import {
  adjustCustomerLoyaltyPoints,
  getCustomerLoyaltyTransactions,
  type CustomerSummary,
  type LoyaltyTransactionRow,
} from '../../../shared/api/customers'
import { normalizeApiError } from '../../../shared/api/errors'
import { formatDate } from '../../../shared/utils/intl'
import { usePermission } from '../../../shared/hooks/usePermission'
import { Button } from '../../../shared/components/ui/Button'

export interface CustomerLoyaltyTabProps {
  customer: CustomerSummary
  onCustomerUpdated: (c: CustomerSummary) => void
}

export function CustomerLoyaltyTab({ customer, onCustomerUpdated }: CustomerLoyaltyTabProps) {
  const canAdjust = usePermission('ROLE_MANAGE')
  const [rows, setRows] = useState<LoyaltyTransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [points, setPoints] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getCustomerLoyaltyTransactions(customer.id))
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [customer.id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdjust(e: FormEvent) {
    e.preventDefault()
    const delta = Number(points)
    if (!Number.isFinite(delta) || delta === 0) {
      setError('Enter a non-zero points adjustment.')
      return
    }
    const magnitude = Math.abs(Math.trunc(delta))
    const isAdd = delta > 0
    if (!isAdd && magnitude > balance) {
      setError(`Cannot subtract ${magnitude} points — current balance is ${balance}.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await adjustCustomerLoyaltyPoints(customer.id, {
        transactionType: isAdd ? 'ADJUST_ADD' : 'ADJUST_SUB',
        points: magnitude,
        notes: notes.trim() || undefined,
      })
      onCustomerUpdated(updated)
      setAdjustOpen(false)
      setPoints('')
      setNotes('')
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  const balance = customer.loyaltyPoints ?? 0

  const columns = useMemo((): DataTableColumn<LoyaltyTransactionRow>[] => [
    {
      key: 'createdAt',
      header: 'Date',
      columnType: 'date',
      render: v => (v ? formatDate(String(v)) : '—'),
    },
    { key: 'transactionType', header: 'Type' },
    {
      key: 'points',
      header: 'Points',
      columnType: 'number',
      render: v => {
        const n = Number(v)
        return n > 0 ? `+${n}` : String(n)
      },
    },
    { key: 'notes', header: 'Notes', render: v => String(v ?? '—') },
  ], [])

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm text-neutral-600">Current balance</p>
        <p className="text-2xl font-bold text-neutral-900">{balance} pts</p>
      </div>

      {canAdjust ? (
        <div>
          <Button type="button" variant="ghost" onClick={() => setAdjustOpen(v => !v)}>
            Adjust points
          </Button>
          {adjustOpen ? (
            <form className="mt-3 max-w-md space-y-3 rounded-xl border p-4" onSubmit={e => void handleAdjust(e)}>
              <label className="block text-sm">
                Points (+ earn / − redeem)
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={points}
                  onChange={e => setPoints(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                Notes
                <input className="mt-1 w-full rounded border px-3 py-2" value={notes} onChange={e => setNotes(e.target.value)} />
              </label>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save adjustment'}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-800">Points history</h3>
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">No loyalty transactions yet.</p>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={loading}
            getRowKey={row => row.id}
            showSearch={false}
            emptyStateLabel="No loyalty transactions yet"
            noResultsLabel="No loyalty transactions match your search"
          />
        )}
      </section>
    </div>
  )
}
