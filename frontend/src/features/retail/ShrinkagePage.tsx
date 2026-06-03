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
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import {
  FormActions,
  FormField,
  FormStack,
  Input,
  Modal,
  useFieldValidation,
} from '../../components/ui'

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

  const formValues = { selectedProductId, quantity, incidentDate }
  const { errors, valid, onBlur, validateAll } = useFieldValidation(formValues, {
    selectedProductId: v => (String(v ?? '') ? undefined : 'Select a product.'),
    quantity: v => {
      const qty = Number(v)
      return Number.isFinite(qty) && qty > 0 ? undefined : 'Enter a valid quantity.'
    },
    incidentDate: v => (String(v ?? '') ? undefined : 'Date is required.'),
  })

  const columns = useMemo((): DataTableColumn<ShrinkageRecordRow>[] => [
    {
      key: 'incidentDate',
      header: 'Date',
      columnType: 'date',
      render: (_v, row) =>
        row.incidentDate ? formatDate(row.incidentDate) : row.createdAt ? formatDate(row.createdAt) : '—',
    },
    {
      key: 'productName',
      header: 'Product',
      render: (_v, row) => row.productName ?? row.sku ?? row.productId.slice(0, 8),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      columnType: 'number',
      render: (_v, row) => shrinkageQty(row),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (_v, row) => reasonLabel(row.reason),
    },
    {
      key: 'recordedBy',
      header: 'Recorded by',
      render: v => <span className="font-mono text-xs">{v ? String(v).slice(0, 8) : '—'}</span>,
    },
    {
      key: 'unitCost',
      header: 'Value',
      columnType: 'currency',
      render: (_v, row) => moneyRwf(shrinkageValue(row)),
    },
  ], [])

  async function handleRecord(e: FormEvent) {
    e.preventDefault()
    if (!validateAll()) return
    const product = products.find(p => p.productId === selectedProductId)
    if (!product) {
      setError('Select a product.')
      return
    }
    const qty = Number(quantity)
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

      <DataTable
        columns={columns}
        rows={filteredRows}
        isLoading={loading}
        getRowKey={row => row.id}
        showSearch={false}
        emptyStateLabel="No shrinkage records for this period"
        noResultsLabel="No shrinkage records match your filters"
        exportFilename="shrinkage"
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Record shrinkage" size="sm">
        <form onSubmit={e => void handleRecord(e)}>
          <FormStack>
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
              {unitCostPreview != null && unitCostPreview > 0 ? (
                <span className="mt-1 block text-xs text-neutral-500">
                  Estimated unit cost: {moneyRwf(unitCostPreview)}
                </span>
              ) : null}
            </FormField>
            <FormField label="Quantity lost" required error={errors.quantity} valid={valid.quantity}>
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
            <FormField label="Reason">
              <select className="mt-1 w-full rounded border px-3 py-2" value={reason} onChange={e => setReason(e.target.value)} required>
                {SHRINKAGE_REASONS.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Date" required error={errors.incidentDate} valid={valid.incidentDate}>
              <Input
                type="date"
                value={incidentDate}
                onChange={e => setIncidentDate(e.target.value)}
                onBlur={() => onBlur('incidentDate')}
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
              {formBusy ? 'Saving…' : 'Save record'}
            </Button>
          </FormActions>
        </form>
      </Modal>
    </div>
  )
}
