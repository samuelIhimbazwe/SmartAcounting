import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  customerCreditLimit,
  customerCreditUsed,
  customerLoyaltyPoints,
  getCustomer,
  getCustomerSales,
  type CustomerSaleRow,
  type CustomerSummary,
} from '../../shared/api/customers'
import { CustomerLayawayTab } from './components/CustomerLayawayTab'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { Button } from '../../shared/components/ui/Button'
import { CustomerCreditTab } from './components/CustomerCreditTab'
import { CustomerForm } from './components/CustomerForm'
import { CustomerHistoryTab } from './components/CustomerHistoryTab'
import { CustomerLoyaltyTab } from './components/CustomerLoyaltyTab'

type TabId = 'history' | 'credit' | 'loyalty' | 'layaway'

function moneyRwf(amount: number) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(
    amount,
  )
}

function creditTone(used: number, limit: number): string {
  if (limit <= 0) return 'text-neutral-700'
  const pct = (used / limit) * 100
  if (pct >= 100) return 'text-red-700'
  if (pct >= 80) return 'text-amber-700'
  return 'text-emerald-700'
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerSummary | null>(null)
  const [sales, setSales] = useState<CustomerSaleRow[]>([])
  const [tab, setTab] = useState<TabId>('history')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [detail, history] = await Promise.all([getCustomer(id), getCustomerSales(id)])
      setCustomer(detail)
      setSales(history)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !customer) {
    return <PageSkeleton />
  }

  if (!customer || !id) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? 'Customer not found.'}</p>
        <Link to="/customers" className="text-sm text-[var(--color-brand-800)] hover:underline">
          Back to customers
        </Link>
      </div>
    )
  }

  const used = customerCreditUsed(customer)
  const limit = customerCreditLimit(customer)
  const tone = creditTone(used, limit)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'history', label: 'Purchase history' },
    { id: 'credit', label: 'Credit & payments' },
    { id: 'loyalty', label: 'Loyalty points' },
    { id: 'layaway', label: 'Layaway orders' },
  ]

  return (
    <div className="page-stack mx-auto max-w-5xl">
      <Link to="/customers" className="text-sm text-[var(--color-brand-800)] hover:underline">
        ← Customers
      </Link>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <article className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold text-neutral-900">{customer.name}</h1>
            <p className="mt-1 text-sm text-neutral-600">{customer.phone ?? 'No phone'} · {customer.email ?? 'No email'}</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => setEditOpen(true)}>
            Edit customer
          </Button>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase text-neutral-500">Credit used / limit</dt>
            <dd className={`text-lg font-semibold ${tone}`}>
              {moneyRwf(used)} / {moneyRwf(limit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-neutral-500">Loyalty points</dt>
            <dd className="text-lg font-semibold text-neutral-900">{customerLoyaltyPoints(customer)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-neutral-500">Customer since</dt>
            <dd className="text-lg font-semibold text-neutral-900">
              {customer.createdAt ? formatDate(customer.createdAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-neutral-500">Status</dt>
            <dd className="text-lg font-semibold text-neutral-900">{customer.level ?? 'Active'}</dd>
          </div>
        </dl>
      </article>

      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex flex-wrap gap-4">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              className={`border-b-2 px-1 pb-2 text-sm font-medium ${
                tab === t.id
                  ? 'border-[var(--color-brand-700)] text-[var(--color-brand-800)]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'history' ? <CustomerHistoryTab sales={sales} loading={loading} /> : null}
      {tab === 'credit' ? (
        <CustomerCreditTab customer={customer} onCustomerUpdated={setCustomer} />
      ) : null}
      {tab === 'loyalty' ? (
        <CustomerLoyaltyTab customer={customer} onCustomerUpdated={setCustomer} />
      ) : null}
      {tab === 'layaway' ? <CustomerLayawayTab customerId={id} /> : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Edit customer</h2>
            <CustomerForm
              mode="edit"
              initial={customer}
              onSaved={c => {
                setCustomer(c)
                setEditOpen(false)
              }}
              onCancel={() => setEditOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
