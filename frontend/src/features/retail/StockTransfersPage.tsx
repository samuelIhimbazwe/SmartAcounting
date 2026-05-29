import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import {
  approveStockTransfer,
  createStockTransfer,
  listStockTransfers,
  receiveStockTransfer,
  rejectStockTransfer,
  transferQty,
  type StockTransferRow,
} from '../../shared/api/stockTransfers'
import { listLocations, type LocationDto } from '../../shared/api/locations'
import { retailListProducts } from '../../shared/api/retail'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

type TabId = 'pending' | 'in-transit' | 'history'

function locationLabel(locations: LocationDto[], id: string): string {
  const loc = locations.find(l => l.id === id)
  return loc?.name ?? loc?.locationCode ?? id.slice(0, 8)
}

export function StockTransfersPage() {
  const [tab, setTab] = useState<TabId>('pending')
  const [rows, setRows] = useState<StockTransferRow[]>([])
  const [locations, setLocations] = useState<LocationDto[]>([])
  const [products, setProducts] = useState<{ productId: string; name: string; sku?: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [contextLocationId, setContextLocationId] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [formBusy, setFormBusy] = useState(false)

  const [histFrom, setHistFrom] = useState('')
  const [histTo, setHistTo] = useState('')
  const [histLocationId, setHistLocationId] = useState('')
  const [histProductId, setHistProductId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [transfers, locs, prods] = await Promise.all([
        listStockTransfers(),
        listLocations(),
        retailListProducts(),
      ])
      setRows(transfers)
      setLocations(locs)
      setProducts(prods)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (contextLocationId) return
    if (locations[0]?.id) {
      setContextLocationId(locations[0].id)
      setFromLocationId(locations[0].id)
    }
  }, [locations, contextLocationId])

  const productOptions = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products.slice(0, 20)
    return products
      .filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q) ||
          p.productId.toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [products, productSearch])

  const pendingRows = useMemo(
    () =>
      rows.filter(
        r =>
          r.status === 'PENDING' &&
          (!contextLocationId || r.fromLocationId === contextLocationId),
      ),
    [rows, contextLocationId],
  )

  const inTransitRows = useMemo(
    () =>
      rows.filter(
        r =>
          r.status === 'IN_TRANSIT' &&
          (!contextLocationId || r.toLocationId === contextLocationId),
      ),
    [rows, contextLocationId],
  )

  const historyRows = useMemo(() => {
    return rows
      .filter(r => r.status === 'RECEIVED' || r.status === 'REJECTED')
      .filter(r => {
        if (histLocationId && r.fromLocationId !== histLocationId && r.toLocationId !== histLocationId) {
          return false
        }
        if (histProductId && !r.lines.some(l => l.productId === histProductId)) return false
        if (histFrom && r.createdAt && r.createdAt.slice(0, 10) < histFrom) return false
        if (histTo && r.createdAt && r.createdAt.slice(0, 10) > histTo) return false
        return true
      })
  }, [rows, histFrom, histTo, histLocationId, histProductId])

  const visibleRows =
    tab === 'pending' ? pendingRows : tab === 'in-transit' ? inTransitRows : historyRows

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!fromLocationId || !toLocationId || !selectedProductId) {
      setError('From location, to location, and product are required.')
      return
    }
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity.')
      return
    }
    setFormBusy(true)
    setError(null)
    try {
      await createStockTransfer({
        fromLocationId,
        toLocationId,
        requestOnly: true,
        notes: notes.trim() || undefined,
        lines: [{ productId: selectedProductId, qty }],
      })
      setFormOpen(false)
      setProductSearch('')
      setSelectedProductId('')
      setQuantity('1')
      setNotes('')
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setFormBusy(false)
    }
  }

  async function handleApprove(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await approveStockTransfer(id, contextLocationId || undefined)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await rejectStockTransfer(id, contextLocationId || undefined)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReceive(row: StockTransferRow) {
    setBusyId(row.id)
    setError(null)
    try {
      await receiveStockTransfer(
        row.id,
        row.lines.map(line => ({
          lineId: line.id,
          productId: line.productId,
          variantId: line.variantId ?? undefined,
          qtyReceived: transferQty(line),
        })),
        contextLocationId || undefined,
      )
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  function productName(productId: string): string {
    return products.find(p => p.productId === productId)?.name ?? productId.slice(0, 8)
  }

  if (loading && rows.length === 0) {
    return <PageSkeleton />
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'in-transit', label: 'In transit' },
    { id: 'history', label: 'History' },
  ]

  return (
    <div className="page-stack mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 text-2xl font-bold text-neutral-900">Stock transfers</h1>
            <p className="m-0 text-sm text-neutral-600">Request, approve, and receive inter-location transfers.</p>
          </div>
        </div>
        <Button type="button" onClick={() => setFormOpen(true)}>
          + Request transfer
        </Button>
      </header>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      <label className="block max-w-xs text-sm">
        Working location
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={contextLocationId}
          onChange={e => setContextLocationId(e.target.value)}
        >
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.name ?? loc.locationCode}
            </option>
          ))}
        </select>
      </label>

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

      {tab === 'history' ? (
        <div className="flex flex-wrap gap-3">
          <input type="date" className="rounded-lg border px-3 py-2 text-sm" value={histFrom} onChange={e => setHistFrom(e.target.value)} />
          <input type="date" className="rounded-lg border px-3 py-2 text-sm" value={histTo} onChange={e => setHistTo(e.target.value)} />
          <select className="rounded-lg border px-3 py-2 text-sm" value={histLocationId} onChange={e => setHistLocationId(e.target.value)}>
            <option value="">All locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name ?? loc.locationCode}
              </option>
            ))}
          </select>
          <select className="rounded-lg border px-3 py-2 text-sm" value={histProductId} onChange={e => setHistProductId(e.target.value)}>
            <option value="">All products</option>
            {products.map(p => (
              <option key={p.productId} value={p.productId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">From → To</th>
              <th className="px-3 py-2">Products</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                  No transfers in this view.
                </td>
              </tr>
            ) : (
              visibleRows.map(row => (
                <tr key={row.id} className="border-t align-top">
                  <td className="px-3 py-2">{row.createdAt ? formatDate(row.createdAt) : '—'}</td>
                  <td className="px-3 py-2">
                    {locationLabel(locations, row.fromLocationId)} → {locationLabel(locations, row.toLocationId)}
                  </td>
                  <td className="px-3 py-2">
                    <ul className="space-y-1">
                      {row.lines.map(line => (
                        <li key={line.id ?? line.productId}>
                          {productName(line.productId)} × {transferQty(line)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {tab === 'pending' ? (
                        <>
                          <Button type="button" disabled={busyId === row.id} onClick={() => void handleApprove(row.id)}>
                            Approve
                          </Button>
                          <Button type="button" variant="ghost" disabled={busyId === row.id} onClick={() => void handleReject(row.id)}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {tab === 'in-transit' ? (
                        <Button type="button" disabled={busyId === row.id} onClick={() => void handleReceive(row)}>
                          Confirm received
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onSubmit={e => void handleCreate(e)}>
            <h2 className="mb-4 text-lg font-semibold">Request transfer</h2>
            <label className="mb-3 block text-sm">
              From location
              <select className="mt-1 w-full rounded border px-3 py-2" value={fromLocationId} onChange={e => setFromLocationId(e.target.value)} required>
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name ?? loc.locationCode}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              To location
              <select className="mt-1 w-full rounded border px-3 py-2" value={toLocationId} onChange={e => setToLocationId(e.target.value)} required>
                <option value="">Select location</option>
                {locations.filter(l => l.id !== fromLocationId).map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name ?? loc.locationCode}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              Product search
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="Search by name or SKU…"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </label>
            <label className="mb-3 block text-sm">
              Product
              <select className="mt-1 w-full rounded border px-3 py-2" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} required>
                <option value="">Select product</option>
                {productOptions.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} {p.sku ? `(${p.sku})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              Quantity
              <input type="number" min={0.0001} step="any" className="mt-1 w-full rounded border px-3 py-2" value={quantity} onChange={e => setQuantity(e.target.value)} required />
            </label>
            <label className="mb-4 block text-sm">
              Notes
              <textarea className="mt-1 w-full rounded border px-3 py-2" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={formBusy}>
                Cancel
              </Button>
              <Button type="submit" disabled={formBusy}>
                {formBusy ? 'Submitting…' : 'Submit request'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
