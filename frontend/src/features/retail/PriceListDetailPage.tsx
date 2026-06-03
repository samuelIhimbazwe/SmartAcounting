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
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { usePermission } from '../../shared/hooks/usePermission'
import { FormActions, FormField, FormSection, FormStack, Input } from '../../components/ui'

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

  const productLineColumns = useMemo((): DataTableColumn<PriceListLineRow>[] => {
    const cols: DataTableColumn<PriceListLineRow>[] = [
      {
        key: 'productName',
        header: 'Product',
        render: (_v, line) => (
          <>
            <div className="font-medium text-neutral-900">{line.productName ?? line.productId}</div>
            {line.sku ? <div className="text-xs text-neutral-500">{line.sku}</div> : null}
          </>
        ),
      },
      {
        key: 'unitPrice',
        header: 'List price',
        render: (_v, line) =>
          editLineId === line.id && canEdit ? (
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
          ),
      },
      {
        key: 'standardPrice',
        header: 'Standard',
        render: v => moneyRwf(v as number | string),
      },
      {
        key: 'differencePct',
        header: 'Difference',
        render: v => priceListDifferenceLabel(v as number | null | undefined),
      },
    ]
    return cols
  }, [canEdit, editLineId, editLinePrice])

  const customerColumns = useMemo((): DataTableColumn<PriceListDetail['customers'][number]>[] => [
    {
      key: 'name',
      header: 'Customer',
      render: (_v, c) => (
        <Link to={`/customers/${c.id}`} className="font-medium text-[var(--color-brand-800)] hover:underline">
          {c.name}
        </Link>
      ),
    },
    { key: 'phone', header: 'Phone', render: v => String(v ?? '—') },
    { key: 'email', header: 'Email', render: v => String(v ?? '—') },
  ], [])

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
              <FormStack className="grid gap-3 sm:grid-cols-3">
                <FormField label="Search product" className="sm:col-span-2">
                  <Input
                    value={productSearch}
                    onChange={ev => setProductSearch(ev.target.value)}
                    placeholder="Name or SKU"
                  />
                </FormField>
                <FormField label="Price (RWF)" required>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={newProductPrice}
                    onChange={ev => setNewProductPrice(ev.target.value)}
                    required
                  />
                </FormField>
              </FormStack>
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
              <FormActions className="mt-3">
                <Button type="submit" disabled={busy || !selectedProductId}>
                  Add to list
                </Button>
              </FormActions>
            </form>
          ) : null}

          <DataTable
            columns={productLineColumns}
            rows={detail.lines}
            getRowKey={row => row.id}
            showSearch={false}
            rowActions={
              canEdit
                ? [
                    {
                      label: 'Edit price',
                      onClick: line => {
                        setEditLineId(line.id)
                        setEditLinePrice(String(num(line.unitPrice)))
                      },
                      disabled: line => editLineId === line.id,
                    },
                    {
                      label: 'Save',
                      onClick: line => void handleSaveLinePrice(line),
                      disabled: line => editLineId !== line.id || busy,
                    },
                    {
                      label: 'Cancel',
                      onClick: () => setEditLineId(null),
                      disabled: line => editLineId !== line.id,
                    },
                  ]
                : undefined
            }
            emptyStateLabel="No products on this list yet"
            noResultsLabel="No products on this list yet"
          />
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
              <FormField label="Search customers">
                <Input
                  value={customerSearch}
                  onChange={ev => setCustomerSearch(ev.target.value)}
                  placeholder="Name or phone"
                />
              </FormField>
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

          <DataTable
            columns={customerColumns}
            rows={detail.customers}
            getRowKey={row => row.id}
            showSearch={false}
            rowActions={
              canEdit
                ? [
                    {
                      label: 'Remove customer',
                      onClick: c => void handleRemoveCustomer(c.id),
                      disabled: () => busy,
                      destructive: true,
                    },
                  ]
                : undefined
            }
            emptyStateLabel="No customers assigned"
            noResultsLabel="No customers assigned"
          />
        </section>
      ) : null}

      {tab === 'rules' ? (
        <section>
          {canEdit ? (
            <form
              onSubmit={e => void handleSaveRules(e)}
              className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <FormSection title="Pricing method">
                <FormField label="Percentage discount (apply % off all products)">
                  <input
                    type="radio"
                    name="pricingMode"
                    checked={pricingMode === 'PERCENTAGE'}
                    onChange={() => setPricingMode('PERCENTAGE')}
                  />
                </FormField>
                <FormField label="Individual product prices (use Products tab)">
                  <input
                    type="radio"
                    name="pricingMode"
                    checked={pricingMode === 'INDIVIDUAL'}
                    onChange={() => setPricingMode('INDIVIDUAL')}
                  />
                </FormField>
                {pricingMode === 'PERCENTAGE' ? (
                  <FormField label="Discount %" className="max-w-xs">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={discountPct}
                      onChange={ev => setDiscountPct(ev.target.value)}
                    />
                  </FormField>
                ) : null}
              </FormSection>

              <FormSection title="List settings" className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="List type">
                    <select
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      value={listType}
                      onChange={ev => setListType(ev.target.value as PriceListType)}
                    >
                      {(['STANDARD', 'WHOLESALE', 'VIP', 'PROMOTIONAL'] as PriceListType[]).map(t => (
                        <option key={t} value={t}>
                          {PRICE_LIST_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Minimum order quantity">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={minOrderQty}
                      onChange={ev => setMinOrderQty(ev.target.value)}
                    />
                  </FormField>
                  <FormField label="Effective from">
                    <Input type="date" value={validFrom} onChange={ev => setValidFrom(ev.target.value)} />
                  </FormField>
                  <FormField label="Effective to">
                    <Input type="date" value={validTo} onChange={ev => setValidTo(ev.target.value)} />
                  </FormField>
                  <FormField label="Active">
                    <input type="checkbox" checked={active} onChange={ev => setActive(ev.target.checked)} />
                  </FormField>
                </div>
              </FormSection>

              <FormActions className="mt-4">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save rules'}
                </Button>
              </FormActions>
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
