import { useCallback, useEffect, useState } from 'react'
import { getCustomerLayaways, type LayawayOrderRow } from '../../../shared/api/customers'
import { normalizeApiError } from '../../../shared/api/errors'
import { formatDate } from '../../../shared/utils/intl'

function money(amount: unknown, currency = 'RWF') {
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
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
        <button
          type="button"
          className="text-sm text-[var(--color-brand-800)] hover:underline"
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? 'Show active only' : 'Show all orders'}
        </button>
      </div>

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
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2">{row.createdAt ? formatDate(row.createdAt) : '—'}</td>
                  <td className="px-3 py-2">{statusLabel(row.status)}</td>
                  <td className="px-3 py-2">{money(row.totalAmount, row.currencyCode ?? 'RWF')}</td>
                  <td className="px-3 py-2">{money(row.depositAmount, row.currencyCode ?? 'RWF')}</td>
                  <td className="px-3 py-2 font-medium">{money(row.balanceDue, row.currencyCode ?? 'RWF')}</td>
                  <td className="px-3 py-2">{row.collectionDate ? formatDate(row.collectionDate) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
