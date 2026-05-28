import { Link } from 'react-router-dom'
import { type CustomerSaleRow } from '../../../shared/api/customers'
import { formatDate } from '../../../shared/utils/intl'
import { Button } from '../../../shared/components/ui/Button'

function money(amount: unknown, currency = 'RWF') {
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export interface CustomerHistoryTabProps {
  sales: CustomerSaleRow[]
  loading: boolean
}

export function CustomerHistoryTab({ sales, loading }: CustomerHistoryTabProps) {
  if (loading) {
    return <p className="text-sm text-neutral-500">Loading purchase history…</p>
  }
  if (sales.length === 0) {
    return <p className="text-sm text-neutral-500">No purchases recorded for this customer yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Items summary</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Payment</th>
            <th className="px-3 py-2">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {sales.map(sale => (
            <tr key={sale.salesOrderId} className="border-t border-[var(--border-subtle)]">
              <td className="px-3 py-2">{sale.createdAt ? formatDate(sale.createdAt) : '—'}</td>
              <td className="px-3 py-2">{sale.itemSummary ?? 'POS sale'}</td>
              <td className="px-3 py-2">{money(sale.totalAmount, sale.currencyCode ?? 'RWF')}</td>
              <td className="px-3 py-2">{sale.paymentMethod ?? '—'}</td>
              <td className="px-3 py-2">
                <Link to={`/pos/receipts/${sale.salesOrderId}/print`}>
                  <Button type="button" variant="ghost">
                    View receipt
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
