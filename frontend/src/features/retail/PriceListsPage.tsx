import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Tags } from 'lucide-react'
import {
  createPriceList,
  listPriceListSummaries,
  PRICE_LIST_STATUS_LABELS,
  PRICE_LIST_TYPE_LABELS,
  priceListStatusTone,
  type PriceListSummary,
  type PriceListType,
} from '../../shared/api/priceLists'
import { normalizeApiError } from '../../shared/api/errors'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { usePermission } from '../../shared/hooks/usePermission'

const LIST_TYPES: PriceListType[] = ['STANDARD', 'WHOLESALE', 'VIP', 'PROMOTIONAL']

export function PriceListsPage() {
  const canEdit = usePermission('INVENTORY_WRITE')
  const [rows, setRows] = useState<PriceListSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [listType, setListType] = useState<PriceListType>('STANDARD')
  const [formBusy, setFormBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listPriceListSummaries())
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    const trimmed = name.trim()
    if (!trimmed) return
    setFormBusy(true)
    setError(null)
    try {
      await createPriceList({ name: trimmed, listType })
      setFormOpen(false)
      setName('')
      setListType('STANDARD')
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setFormBusy(false)
    }
  }

  if (loading && rows.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="page-stack">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-brand-800)]">
            <Tags className="h-5 w-5" aria-hidden />
            <h1 className="text-xl font-semibold text-neutral-900">Price lists</h1>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Manage customer-specific and promotional pricing for POS checkout.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" onClick={() => setFormOpen(v => !v)}>
            {formOpen ? 'Cancel' : '+ Create price list'}
          </Button>
        ) : null}
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {formOpen && canEdit ? (
        <form
          onSubmit={e => void handleCreate(e)}
          className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-neutral-900">New price list</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-neutral-700">Name</span>
              <input
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={name}
                onChange={ev => setName(ev.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-neutral-700">Type</span>
              <select
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                value={listType}
                onChange={ev => setListType(ev.target.value as PriceListType)}
              >
                {LIST_TYPES.map(t => (
                  <option key={t} value={t}>
                    {PRICE_LIST_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={formBusy}>
              {formBusy ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Customers assigned</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No price lists yet.{canEdit ? ' Create one to get started.' : ''}
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">{row.name}</td>
                  <td className="px-4 py-3 text-neutral-700">{PRICE_LIST_TYPE_LABELS[row.listType] ?? row.listType}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.customersAssigned}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.products}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priceListStatusTone(row.status)}`}
                    >
                      {PRICE_LIST_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/retail/price-lists/${row.id}`}
                      className="text-[var(--color-brand-800)] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
