import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { PackageMinus } from 'lucide-react'
import {
  getShrinkageSummary,
  getShrinkageUnitCost,
  listShrinkage,
  recordShrinkage,
  shrinkageQty,
  shrinkageValue,
  type ShrinkageRecordRow,
} from '../../shared/api/shrinkage'
import { retailListProducts } from '../../shared/api/retail'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

const SHRINKAGE_REASONS = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'THEFT', label: 'Theft' },
  { value: 'COUNT_VARIANCE', label: 'Count variance' },
  { value: 'OTHER', label: 'Other' },
] as const

function moneyRwf(amount: number) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(
    amount,
  )
}

function monthRange(offsetMonths = 0): { from: string; to: string } {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offsetMonths)
  const from = d.toISOString().slice(0, 10)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const to = end.toISOString().slice(0, 10)
  return { from, to }
}

function pctChange(current: number, previous: number): string {
  if (previous <= 0) return current > 0 ? '+100%' : '0%'
  const pct = ((current - previous) / previous) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function ShrinkagePage() {
  const [rows, setRows] = useState<ShrinkageRecordRow[]>([])
  const [products, setProducts] = useState<{ productId: string; name: string; sku?: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formBusy, setFormBusy] = useState(false)

  const [fromDate, setFromDate] = useState(() => monthRange(0).from)
  const [toDate, setToDate] = useState(() => monthRange(0).to)
  const [filterProductId, setFilterProductId] = useState('')
  const [filterReason, setFilterReason] = useState('')

  const [monthUnits, setMonthUnits] = useState(0)
  const [monthValue, setMonthValue] = useState(0)
  const [valueChangePct, setValueChangePct] = useState('0%')

  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState<string>(SHRINKAGE_REASONS[0].value)
  const [notes, setNotes] = useState('')
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [unitCostPreview, setUnitCostPreview] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const thisMonth = monthRange(0)
      const lastMonth = monthRange(-1)
      const [list, prods, thisSummary, lastSummary] = await Promise.all([
        listShrinkage({ from: fromDate, to: toDate, size: 200 }),
        retailListProducts(),
        getShrinkageSummary(thisMonth.from, thisMonth.to),
        getShrinkageSummary(lastMonth.from, lastMonth.to),
      ])
      setRows(list)
      setProducts(prods)

      const thisMonthList = await listShrinkage({ from: thisMonth.from, to: thisMonth.to, size: 500 })
      const units = thisMonthList.reduce((sum, row) => sum + shrinkageQty(row), 0)
      const value = Number(thisSummary.totalCost ?? 0)
      const prevValue = Number(lastSummary.totalCost ?? 0)
      setMonthUnits(units)
      setMonthValue(value)
      setValueChangePct(pctChange(value, prevValue))
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedProductId) {
      setUnitCostPreview(null)
      return
    }
    void getShrinkageUnitCost(selectedProductId)
      .then(setUnitCostPreview)
      .catch(() => setUnitCostPreview(null))
  }, [selectedProductId])

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

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (filterProductId && row.productId !== filterProductId) return false
      if (filterReason && (row.reason ?? '').toUpperCase() !== filterReason) return false
      return true
    })
  }, [rows, filterProductId, filterReason])

  async function handleRecord(e: FormEvent) {
    e.preventDefault()
    const product = products.find(p => p.productId === selectedProductId)
    if (!product) {
      setError('Select a product.')
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
      await recordShrinkage({
        productId: product.productId,
        sku: product.sku ?? product.productId,
        productName: product.name,
        quantity: qty,
        unitCost: 0,
        reason,
        incidentDate,
        notes: notes.trim() || undefined,
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

  function reasonLabel(code?: string): string {
    const match = SHRINKAGE_REASONS.find(r => r.value === (code ?? '').toUpperCase())
    return match?.label ?? code ?? '—'
  }

  if (loading && rows.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="page-stack mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <PackageMinus className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 text-2xl font-bold text-neutral-900">Shrinkage</h1>
            <p className="m-0 text-sm text-neutral-600">Record and review stock losses and write-offs.</p>
          </div>
        </div>
        <Button type="button" onClick={() => setFormOpen(true)}>
          + Record shrinkage
        </Button>
      </header>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-neutral-500">Total shrinkage this month</p>
          <p className="text-2xl font-bold text-neutral-900">{monthUnits.toFixed(2)} units</p>
          <p className="text-lg font-semibold text-neutral-700">{moneyRwf(monthValue)}</p>
        </article>
        <article className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-neutral-500">Value vs last month</p>
          <p className={`text-2xl font-bold ${valueChangePct.startsWith('+') ? 'text-red-700' : 'text-emerald-700'}`}>
            {valueChangePct}
          </p>
          <p className="text-sm text-neutral-600">Month-over-month change in shrinkage value</p>
        </article>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="date" className="rounded-lg border px-3 py-2 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <input type="date" className="rounded-lg border px-3 py-2 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
        <select className="rounded-lg border px-3 py-2 text-sm" value={filterProductId} onChange={e => setFilterProductId(e.target.value)}>
          <option value="">All products</option>
          {products.map(p => (
            <option key={p.productId} value={p.productId}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={filterReason} onChange={e => setFilterReason(e.target.value)}>
          <option value="">All reasons</option>
          {SHRINKAGE_REASONS.map(r => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Quantity</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Recorded by</th>
              <th className="px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                  No shrinkage records for this period.
                </td>
              </tr>
            ) : (
              filteredRows.map(row => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.incidentDate ? formatDate(row.incidentDate) : row.createdAt ? formatDate(row.createdAt) : '—'}</td>
                  <td className="px-3 py-2">{row.productName ?? row.sku ?? row.productId.slice(0, 8)}</td>
                  <td className="px-3 py-2">{shrinkageQty(row)}</td>
                  <td className="px-3 py-2">{reasonLabel(row.reason)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.recordedBy?.slice(0, 8) ?? '—'}</td>
                  <td className="px-3 py-2">{moneyRwf(shrinkageValue(row))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onSubmit={e => void handleRecord(e)}>
            <h2 className="mb-4 text-lg font-semibold">Record shrinkage</h2>
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
              {unitCostPreview != null && unitCostPreview > 0 ? (
                <span className="mt-1 block text-xs text-neutral-500">
                  Estimated unit cost: {moneyRwf(unitCostPreview)}
                </span>
              ) : null}
            </label>
            <label className="mb-3 block text-sm">
              Quantity lost
              <input type="number" min={0.0001} step="any" className="mt-1 w-full rounded border px-3 py-2" value={quantity} onChange={e => setQuantity(e.target.value)} required />
            </label>
            <label className="mb-3 block text-sm">
              Reason
              <select className="mt-1 w-full rounded border px-3 py-2" value={reason} onChange={e => setReason(e.target.value)} required>
                {SHRINKAGE_REASONS.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              Date
              <input type="date" className="mt-1 w-full rounded border px-3 py-2" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} required />
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
                {formBusy ? 'Saving…' : 'Save record'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
