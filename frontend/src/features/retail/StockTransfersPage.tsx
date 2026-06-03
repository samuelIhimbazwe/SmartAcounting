import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import {
  approveStockTransfer,
  createStockTransfer,
  dispatchStockTransfer,
  listStockTransfers,
  receiveStockTransfer,
  rejectStockTransfer,
  transferQty,
  type StockTransferRow,
} from '../../shared/api/stockTransfers'
import { listLocations, type LocationDto } from '../../shared/api/locations'
import { retailListProducts } from '../../shared/api/retail'
import { normalizeApiError } from '../../shared/api/errors'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type DataTableColumn, type DataTableRowAction } from '../../shared/components/ui/DataTable'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import {
  FormActions,
  FormField,
  FormStack,
  Input,
  Modal,
  useFieldValidation,
} from '../../components/ui'

type TabId = 'pending' | 'approved' | 'in-transit' | 'history'

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

  const approvedRows = useMemo(
    () =>
      rows.filter(
        r =>
          r.status === 'APPROVED' &&
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
    tab === 'pending'
      ? pendingRows
      : tab === 'approved'
        ? approvedRows
        : tab === 'in-transit'
          ? inTransitRows
          : historyRows

  const formValues = { fromLocationId, toLocationId, selectedProductId, quantity }
  const { errors, valid, onBlur, validateAll } = useFieldValidation(formValues, {
    fromLocationId: v => (String(v ?? '') ? undefined : 'From location is required.'),
    toLocationId: v => (String(v ?? '') ? undefined : 'To location is required.'),
    selectedProductId: v => (String(v ?? '') ? undefined : 'Product is required.'),
    quantity: v => {
      const qty = Number(v)
      return Number.isFinite(qty) && qty > 0 ? undefined : 'Enter a valid quantity.'
    },
  })

  const columns = useMemo((): DataTableColumn<StockTransferRow>[] => [
    { key: 'createdAt', header: 'Date', columnType: 'date' },
    {
      key: 'fromLocationId',
      header: 'From → To',
      render: (_v, row) =>
        `${locationLabel(locations, row.fromLocationId)} → ${locationLabel(locations, row.toLocationId)}`,
    },
    {
      key: 'id',
      header: 'Products',
      render: (_v, row) => (
        <ul className="space-y-1">
          {row.lines.map(line => (
            <li key={line.id ?? line.productId}>
              {productName(line.productId)} × {transferQty(line)}
            </li>
          ))}
        </ul>
      ),
    },
    { key: 'status', header: 'Status', columnType: 'status' },
  ], [locations, products])

  const rowActions = useMemo((): DataTableRowAction<StockTransferRow>[] => {
    if (tab === 'pending') {
      return [
        { label: 'Approve', onClick: row => void handleApprove(row.id), disabled: row => busyId === row.id },
        { label: 'Reject', onClick: row => void handleReject(row.id), disabled: row => busyId === row.id, destructive: true },
      ]
    }
    if (tab === 'approved') {
      return [{ label: 'Dispatch', onClick: row => void handleDispatch(row.id), disabled: row => busyId === row.id }]
    }
    if (tab === 'in-transit') {
      return [{ label: 'Confirm received', onClick: row => void handleReceive(row), disabled: row => busyId === row.id }]
    }
    return []
  }, [tab, busyId])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!validateAll()) return
    const qty = Number(quantity)
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

  async function handleDispatch(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await dispatchStockTransfer(id, contextLocationId || undefined)
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
    { id: 'pending', label: 'Pending approval' },
    { id: 'approved', label: 'Ready to dispatch' },
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

      <FormField label="Working location" className="max-w-xs">
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={contextLocationId}
          onChange={e => setContextLocationId(e.target.value)}
        >
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.name ?? loc.locationCode}
            </option>
          ))}
        </select>
      </FormField>

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

      <DataTable
        columns={columns}
        rows={visibleRows}
        isLoading={loading}
        getRowKey={row => row.id}
        rowActions={rowActions.length > 0 ? rowActions : undefined}
        showSearch={false}
        emptyStateLabel="No transfers in this view"
        noResultsLabel="No transfers in this view"
        exportFilename="stock-transfers"
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Request transfer" size="sm">
        <form onSubmit={e => void handleCreate(e)}>
          <FormStack>
            <FormField label="From location" required error={errors.fromLocationId} valid={valid.fromLocationId}>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={fromLocationId}
                onChange={e => setFromLocationId(e.target.value)}
                onBlur={() => onBlur('fromLocationId')}
                required
              >
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name ?? loc.locationCode}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="To location" required error={errors.toLocationId} valid={valid.toLocationId}>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={toLocationId}
                onChange={e => setToLocationId(e.target.value)}
                onBlur={() => onBlur('toLocationId')}
                required
              >
                <option value="">Select location</option>
                {locations.filter(l => l.id !== fromLocationId).map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name ?? loc.locationCode}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Product search">
              <Input
                placeholder="Search by name or SKU…"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </FormField>
            <FormField label="Product" required error={errors.selectedProductId} valid={valid.selectedProductId}>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                onBlur={() => onBlur('selectedProductId')}
                required
              >
                <option value="">Select product</option>
                {productOptions.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} {p.sku ? `(${p.sku})` : ''}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Quantity" required error={errors.quantity} valid={valid.quantity}>
              <Input
                type="number"
                min={0.0001}
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                onBlur={() => onBlur('quantity')}
                required
              />
            </FormField>
            <FormField label="Notes">
              <textarea className="mt-1 w-full rounded border px-3 py-2" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </FormField>
          </FormStack>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={formBusy}>
              Cancel
            </Button>
            <Button type="submit" disabled={formBusy}>
              {formBusy ? 'Submitting…' : 'Submit request'}
            </Button>
          </FormActions>
        </form>
      </Modal>
    </div>
  )
}
