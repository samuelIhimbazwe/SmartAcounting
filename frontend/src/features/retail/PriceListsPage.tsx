import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { usePermission } from '../../shared/hooks/usePermission'
import {
  FormActions,
  FormField,
  FormStack,
  Input,
  Select,
  useFieldValidation,
} from '../../components/ui'

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

  const formValues = { name, listType }
  const { errors, valid, onBlur, validateAll } = useFieldValidation(formValues, {
    name: value => (String(value ?? '').trim() ? undefined : 'Name is required.'),
  })

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

  const columns = useMemo((): DataTableColumn<PriceListSummary>[] => [
    { key: 'name', header: 'Name' },
    {
      key: 'listType',
      header: 'Type',
      render: v => PRICE_LIST_TYPE_LABELS[v as PriceListType] ?? String(v),
    },
    { key: 'customersAssigned', header: 'Customers assigned', columnType: 'number' },
    { key: 'products', header: 'Products', columnType: 'number' },
    {
      key: 'status',
      header: 'Status',
      render: v => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priceListStatusTone(v as PriceListSummary['status'])}`}>
          {PRICE_LIST_STATUS_LABELS[v as PriceListSummary['status']]}
        </span>
      ),
    },
  ], [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!canEdit || !validateAll()) return
    const trimmed = name.trim()
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
          <FormStack className="mt-3 sm:grid-cols-2">
            <FormField label="Name" required error={errors.name} valid={valid.name}>
              <Input
                value={name}
                onChange={ev => setName(ev.target.value)}
                onBlur={() => onBlur('name')}
                required
              />
            </FormField>
            <FormField label="Type">
              <Select
                value={listType}
                onChange={v => setListType((v ?? 'STANDARD') as PriceListType)}
                options={LIST_TYPES.map(t => ({ value: t, label: PRICE_LIST_TYPE_LABELS[t] }))}
                clearable={false}
              />
            </FormField>
          </FormStack>
          <FormActions>
            <Button type="submit" disabled={formBusy}>
              {formBusy ? 'Creating…' : 'Create'}
            </Button>
          </FormActions>
        </form>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        isLoading={loading}
        getRowKey={row => row.id}
        primaryAction={{
          label: 'View',
          href: row => `/retail/price-lists/${row.id}`,
        }}
        emptyStateLabel="No price lists yet"
        noResultsLabel="No price lists match your search"
        exportFilename="price-lists"
      />
    </div>
  )
}
