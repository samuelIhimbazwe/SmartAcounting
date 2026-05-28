import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { listCustomers, type CustomerSummary } from '../../shared/api/customers'
import { normalizeApiError } from '../../shared/api/errors'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { useAnyPermission } from '../../shared/hooks/usePermission'
import { CUSTOMER_ACCESS_ANY } from '../../shared/security/permissions'
import { CustomerForm } from './components/CustomerForm'
import { CustomerTable } from './components/CustomerTable'

type FilterKey = 'hasCredit' | 'hasLoyalty' | 'hideCreditAlert'

function whatsAppReminderUrl(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '')
  const intl = digits.startsWith('250') ? digits : digits.startsWith('0') ? `250${digits.slice(1)}` : `250${digits}`
  const text = `Hello ${name}, this is a reminder from our store. Please contact us regarding your account.`
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
}

export function CustomersPage() {
  const canWrite = useAnyPermission([...CUSTOMER_ACCESS_ANY])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    hasCredit: false,
    hasLoyalty: false,
    hideCreditAlert: true,
  })
  const [rows, setRows] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CustomerSummary | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listCustomers(search))
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 300)
    return () => window.clearTimeout(t)
  }, [load])

  const filtered = useMemo(() => {
    return rows.filter(row => {
      if (filters.hasCredit && Number(row.creditBalance ?? 0) <= 0) return false
      if (filters.hasLoyalty && Number(row.loyaltyPoints ?? 0) <= 0) return false
      if (filters.hideCreditAlert && row.level === 'EXCEEDED') return false
      return true
    })
  }, [rows, filters])

  function toggleFilter(key: FilterKey) {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSaved(customer: CustomerSummary) {
    setFormOpen(false)
    setEditTarget(null)
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === customer.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = customer
        return next
      }
      return [customer, ...prev]
    })
  }

  function handleSendReminder(customer: CustomerSummary) {
    if (!customer.phone) return
    window.open(whatsAppReminderUrl(customer.phone, customer.name), '_blank', 'noopener,noreferrer')
  }

  if (loading && rows.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="page-stack mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 text-2xl font-bold text-neutral-900">Customers</h1>
            <p className="m-0 text-sm text-neutral-600">Search, manage credit, loyalty, and purchase history.</p>
          </div>
        </div>
        <Button
          type="button"
          disabled={!canWrite}
          title={canWrite ? undefined : 'You do not have permission to add customers.'}
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
        >
          + Add Customer
        </Button>
      </header>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm md:max-w-md"
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search customers"
        />
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.hasCredit} onChange={() => toggleFilter('hasCredit')} />
            Has credit
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.hasLoyalty} onChange={() => toggleFilter('hasLoyalty')} />
            Has loyalty
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.hideCreditAlert} onChange={() => toggleFilter('hideCreditAlert')} />
            Hide over credit limit
          </label>
        </div>
      </div>

      <CustomerTable
        rows={filtered}
        canWrite={canWrite}
        onEdit={c => {
          setEditTarget(c)
          setFormOpen(true)
        }}
        onSendReminder={handleSendReminder}
      />

      {formOpen && canWrite ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{editTarget ? 'Edit customer' : 'Add customer'}</h2>
            <CustomerForm
              mode={editTarget ? 'edit' : 'create'}
              initial={editTarget}
              onSaved={handleSaved}
              onCancel={() => {
                setFormOpen(false)
                setEditTarget(null)
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
