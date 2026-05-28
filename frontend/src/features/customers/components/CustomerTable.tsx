import { Link } from 'react-router-dom'
import { formatDate } from '../../../shared/utils/intl'
import {
  customerCreditUsed,
  customerLoyaltyPoints,
  type CustomerSummary,
} from '../../../shared/api/customers'
import { Button } from '../../../shared/components/ui/Button'

function moneyRwf(amount: number) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(
    amount,
  )
}

export interface CustomerTableProps {
  rows: CustomerSummary[]
  canWrite?: boolean
  onEdit: (customer: CustomerSummary) => void
  onSendReminder: (customer: CustomerSummary) => void
}

export function CustomerTable({ rows, canWrite = true, onEdit, onSendReminder }: CustomerTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
        No customers match your search and filters.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Credit balance</th>
            <th className="px-3 py-2 font-medium">Loyalty pts</th>
            <th className="px-3 py-2 font-medium">Last purchase</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-t border-[var(--border-subtle)]">
              <td className="px-3 py-2 font-medium text-neutral-900">{row.name}</td>
              <td className="px-3 py-2">{row.phone ?? '—'}</td>
              <td className="px-3 py-2">{row.email ?? '—'}</td>
              <td className="px-3 py-2">{moneyRwf(customerCreditUsed(row))}</td>
              <td className="px-3 py-2">{customerLoyaltyPoints(row)}</td>
              <td className="px-3 py-2">
                {row.lastPurchaseAt ? formatDate(row.lastPurchaseAt) : '—'}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Link to={`/customers/${row.id}`}>
                    <Button type="button" variant="ghost">
                      View
                    </Button>
                  </Link>
                  <Button type="button" variant="ghost" onClick={() => onEdit(row)} disabled={!canWrite}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onSendReminder(row)}
                    disabled={!row.phone}
                  >
                    Send reminder
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
