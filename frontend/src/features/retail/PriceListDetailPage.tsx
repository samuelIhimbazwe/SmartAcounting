import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  assignPriceListCustomer,
  getPriceList,
  PRICE_LIST_STATUS_LABELS,
  PRICE_LIST_TYPE_LABELS,
  priceListDifferenceLabel,
  priceListStatusTone,
  unassignPriceListCustomer,
  updatePriceList,
  type PriceListDetail,
  type PriceListLineRow,
  type PriceListType,
} from '../../shared/api/priceLists'
import { listCustomers } from '../../shared/api/customers'
import { retailListProducts } from '../../shared/api/retail'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { usePermission } from '../../shared/hooks/usePermission'

type TabId = 'products' | 'customers' | 'rules'

function moneyRwf(amount: number | string | null | undefined) {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n)
}

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function toInstantDate(date: string): string | null {
  if (!date) return null
  return `${date}T00:00:00.000Z`
}

export function PriceListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const canEdit = usePermission('INVENTORY_WRITE')
  const [detail, setDetail] = useState<PriceListDetail | null>(null)
  const [tab, setTab] = useState<TabId>('products')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editLineId, setEditLineId] = useState<string | null>(null)
  const [editLinePrice, setEditLinePrice] = useState('')

  const [addProductOpen, setAddProductOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')

  const [products, setProducts] = useState<{ productId: string; name: string; sku?: string | null }[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<{ id: string; name: string; phone?: string | null }[]>([])

  const [discountPct, setDiscountPct] = useState('')
  const [minOrderQty, setMinOrderQty] = useState('1')
  const [pricingMode, setPricingMode] = useState<'PERCENTAGE' | 'INDIVIDUAL'>('INDIVIDUAL')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [active, setActive] = useState(true)
  const [listType, setListType] = useState<PriceListType>('STANDARD')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [data, prods] = await Promise.all([getPriceList(id), retailListProducts()])
      setDetail(data)
      setProducts(prods)
      setDiscountPct(data.discountPct != null ? String(num(data.discountPct)) : '')
      setMinOrderQty(String(data.minOrderQty ?? 1))
      setPricingMode(data.discountPct != null && num(data.discountPct) > 0 ? 'PERCENTAGE' : 'INDIVIDUAL')
      setValidFrom(toDateInput(data.validFrom))
      setValidTo(toDateInput(data.validTo))
      setActive(data.active !== false)
      setListType(data.listType)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!assignOpen) return
    const t = window.setTimeout(() => {
      void listCustomers(customerSearch)
        .then(rows =>
          setCustomerOptions(
            rows.map(c => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
            })),
          ),
        )
        .catch(() => setCustomerOptions([]))
    }, 300)
    return () => window.clearTimeout(t)
  }, [assignOpen, customerSearch])

  const productOptions = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    const existing = new Set(detail?.lines.map(l => l.productId) ?? [])
    const pool = products.filter(p => !existing.has(p.productId))
    if (!q) return pool.slice(0, 20)
    return pool
      .filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q) ||
          p.productId.toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [products, productSearch, detail?.lines])

  async function saveLines(nextLines: PriceListLineRow[]) {
    if (!id || !canEdit || !detail) return
    setBusy(true)
    setError(null)
    try {
      const updated = await updatePriceList(id, {
        listType: detail.listType,
        discountPct: detail.discountPct != null ? num(detail.discountPct) : null,
        minOrderQty: detail.minOrderQty ?? 1,
        validFrom: detail.validFrom ?? null,
        validTo: detail.validTo ?? null,
        active: detail.active !== false,
        lines: nextLines.map(l => ({
          lineId: l.id,
          productId: l.productId,
          variantId: l.variantId ?? undefined,
          unitPrice: num(l.unitPrice),
        })),
      })
      setDetail(updated)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveLinePrice(line: PriceListLineRow) {
    const price = num(editLinePrice)
    if (price <= 0 || !detail) return
    const nextLines = detail.lines.map(l => (l.id === line.id ? { ...l, unitPrice: price } : l))
    setEditLineId(null)
    await saveLines(nextLines)
  }

  async function handleAddProduct(e: FormEvent) {
    e.preventDefault()
    if (!detail || !selectedProductId || !canEdit) return
    const price = num(newProductPrice)
    if (price <= 0) return
    const product = products.find(p => p.productId === selectedProductId)
    const nextLines: PriceListLineRow[] = [
      ...detail.lines,
      {
        id: `new-${selectedProductId}`,
        productId: selectedProductId,
        productName: product?.name,
        sku: product?.sku,
        unitPrice: price,
      },
    ]
    setAddProductOpen(false)
    setSelectedProductId('')
    setNewProductPrice('')
    setProductSearch('')
    await saveLines(nextLines)
  }

  async function handleAssignCustomer(customerId: string) {
    if (!id || !canEdit) return
    setBusy(true)
    setError(null)
    try {
      await assignPriceListCustomer(id, customerId)
      setAssignOpen(false)
      setCustomerSearch('')
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveCustomer(customerId: string) {
    if (!id || !canEdit) return
    if (!window.confirm('Remove this customer from the price list?')) return
    setBusy(true)
    setError(null)
    try {
      await unassignPriceListCustomer(id, customerId)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveRules(e: FormEvent) {
    e.preventDefault()
    if (!id || !canEdit) return
    setBusy(true)
    setError(null)
    try {
      const updated = await updatePriceList(id, {
        listType,
        discountPct: pricingMode === 'PERCENTAGE' ? num(discountPct) : null,
        minOrderQty: Math.max(1, num(minOrderQty)),
        validFrom: toInstantDate(validFrom),
        validTo: toInstantDate(validTo),
        active,
      })
      setDetail(updated)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading && !detail) {
    return <PageSkeleton />
  }

  if (!detail || !id) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? 'Price list not found.'}</p>
        <Link to="/retail/price-lists" className="text-sm text-[var(--color-brand-800)] hover:underline">
          Back to price lists
        </Link>
      </div>
    )
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'products', label: 'Products & prices' },
    { id: 'customers', label: 'Assigned customers' },
    { id: 'rules', label: 'Rules' },
  ]

  return (
    <div className="page-stack mx-auto max-w-5xl">
      <Link to="/retail/price-lists" className="text-sm text-[var(--color-brand-800)] hover:underline">
        ← Price lists
      </Link>

      <header className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">{detail.name}</h1>
            <p className="mt-1 text-sm text-neutral-600">
              {PRICE_LIST_TYPE_LABELS[detail.listType]} · {detail.currencyCode ?? 'RWF'}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priceListStatusTone(detail.status)}`}
          >
            {PRICE_LIST_STATUS_LABELS[detail.status]}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-neutral-500">Effective from</dt>
            <dd className="font-medium text-neutral-900">
              {detail.validFrom ? formatDate(detail.validFrom) : 'Any time'}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Effective to</dt>
            <dd className="font-medium text-neutral-900">
              {detail.validTo ? formatDate(detail.validTo) : 'No end date'}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Min order qty</dt>
            <dd className="font-medium text-neutral-900">{detail.minOrderQty ?? 1}</dd>
          </div>
        </dl>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2 border-b border-neutral-200">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? 'border-[var(--color-brand-800)] text-[var(--color-brand-800)]'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">Product prices compared to the standard POS catalog price.</p>
            {canEdit ? (
              <Button type="button" onClick={() => setAddProductOpen(v => !v)}>
                {addProductOpen ? 'Cancel' : 'Add product'}
              </Button>
            ) : null}
          </div>

          {addProductOpen && canEdit ? (
            <form
              onSubmit={e => void handleAddProduct(e)}
              className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm sm:col-span-2">
                  <span className="text-neutral-700">Search product</span>
                  <input
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={productSearch}
                    onChange={ev => setProductSearch(ev.target.value)}
                    placeholder="Name or SKU"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-neutral-700">Price (RWF)</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={newProductPrice}
                    onChange={ev => setNewProductPrice(ev.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-neutral-200">
                {productOptions.map(p => (
                  <button
                    key={p.productId}
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                      selectedProductId === p.productId ? 'bg-neutral-100 font-medium' : ''
                    }`}
                    onClick={() => setSelectedProductId(p.productId)}
                  >
                    {p.name}
                    {p.sku ? <span className="ml-2 text-neutral-500">{p.sku}</span> : null}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="submit" disabled={busy || !selectedProductId}>
                  Add to list
                </Button>
              </div>
            </form>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">List price</th>
                  <th className="px-4 py-3 font-medium">Standard</th>
                  <th className="px-4 py-3 font-medium">Difference</th>
                  {canEdit ? <th className="px-4 py-3 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {detail.lines.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-neutral-500">
                      No products on this list yet.
                    </td>
                  </tr>
                ) : (
                  detail.lines.map(line => (
                    <tr key={line.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{line.productName ?? line.productId}</div>
                        {line.sku ? <div className="text-xs text-neutral-500">{line.sku}</div> : null}
                      </td>
                      <td className="px-4 py-3">
                        {editLineId === line.id && canEdit ? (
                          <input
                            type="number"
                            min={1}
                            step={1}
                            className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                            value={editLinePrice}
                            onChange={ev => setEditLinePrice(ev.target.value)}
                          />
                        ) : (
                          moneyRwf(line.unitPrice)
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{moneyRwf(line.standardPrice)}</td>
                      <td className="px-4 py-3 text-neutral-700">
                        {priceListDifferenceLabel(line.differencePct)}
                      </td>
                      {canEdit ? (
                        <td className="px-4 py-3">
                          {editLineId === line.id ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleSaveLinePrice(line)}
                              >
                                Save
                              </Button>
                              <Button type="button" variant="ghost" onClick={() => setEditLineId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-[var(--color-brand-800)] hover:underline"
                              onClick={() => {
                                setEditLineId(line.id)
                                setEditLinePrice(String(num(line.unitPrice)))
                              }}
                            >
                              Edit price
                            </button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'customers' ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">Customers who checkout with this price list at POS.</p>
            {canEdit ? (
              <Button type="button" onClick={() => setAssignOpen(v => !v)}>
                {assignOpen ? 'Cancel' : 'Assign customer'}
              </Button>
            ) : null}
          </div>

          {assignOpen && canEdit ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <label className="block text-sm">
                <span className="text-neutral-700">Search customers</span>
                <input
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  value={customerSearch}
                  onChange={ev => setCustomerSearch(ev.target.value)}
                  placeholder="Name or phone"
                />
              </label>
              <ul className="mt-2 max-h-48 overflow-y-auto divide-y divide-neutral-100">
                {customerOptions
                  .filter(c => !detail.customers.some(a => a.id === c.id))
                  .map(c => (
                    <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {c.name}
                        {c.phone ? <span className="ml-2 text-neutral-500">{c.phone}</span> : null}
                      </span>
                      <Button type="button" disabled={busy} onClick={() => void handleAssignCustomer(c.id)}>
                        Assign
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  {canEdit ? <th className="px-4 py-3 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {detail.customers.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 4 : 3} className="px-4 py-8 text-center text-neutral-500">
                      No customers assigned.
                    </td>
                  </tr>
                ) : (
                  detail.customers.map(c => (
                    <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        <Link to={`/customers/${c.id}`} className="text-[var(--color-brand-800)] hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{c.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-neutral-700">{c.email ?? '—'}</td>
                      {canEdit ? (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-red-700 hover:underline"
                            disabled={busy}
                            onClick={() => void handleRemoveCustomer(c.id)}
                          >
                            Remove customer
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'rules' ? (
        <section>
          {canEdit ? (
            <form
              onSubmit={e => void handleSaveRules(e)}
              className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-neutral-900">Pricing method</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pricingMode"
                    checked={pricingMode === 'PERCENTAGE'}
                    onChange={() => setPricingMode('PERCENTAGE')}
                  />
                  Percentage discount (apply % off all products)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pricingMode"
                    checked={pricingMode === 'INDIVIDUAL'}
                    onChange={() => setPricingMode('INDIVIDUAL')}
                  />
                  Individual product prices (use Products tab)
                </label>
              </fieldset>

              {pricingMode === 'PERCENTAGE' ? (
                <label className="block max-w-xs text-sm">
                  <span className="text-neutral-700">Discount %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={discountPct}
                    onChange={ev => setDiscountPct(ev.target.value)}
                  />
                </label>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-neutral-700">List type</span>
                  <select
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={listType}
                    onChange={ev => setListType(ev.target.value as PriceListType)}
                  >
                    {(['STANDARD', 'WHOLESALE', 'VIP', 'PROMOTIONAL'] as PriceListType[]).map(t => (
                      <option key={t} value={t}>
                        {PRICE_LIST_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-neutral-700">Minimum order quantity</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={minOrderQty}
                    onChange={ev => setMinOrderQty(ev.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-neutral-700">Effective from</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={validFrom}
                    onChange={ev => setValidFrom(ev.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-neutral-700">Effective to</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    value={validTo}
                    onChange={ev => setValidTo(ev.target.value)}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={ev => setActive(ev.target.checked)} />
                Active
              </label>

              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save rules'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700 shadow-sm">
              <p>
                Pricing:{' '}
                {detail.discountPct != null && num(detail.discountPct) > 0
                  ? `${num(detail.discountPct)}% discount on all products`
                  : 'Individual product prices'}
              </p>
              <p className="mt-2">Minimum order quantity: {detail.minOrderQty ?? 1}</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
