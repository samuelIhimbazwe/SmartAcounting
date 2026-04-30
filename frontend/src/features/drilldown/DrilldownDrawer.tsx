import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDrilldownRows } from './useDrilldownRows'
import { formatKpiValue } from '../../shared/utils/format'
import type { Role } from '../../shared/types/roles'
import { DataTable } from '../../shared/components/ui/DataTable'
import type { DrilldownRow } from '../../shared/types/dashboard'

interface DrilldownDrawerProps {
  role: Role
  metric: string | null
  onClose: () => void
}

export function DrilldownDrawer({ role, metric, onClose }: DrilldownDrawerProps) {
  const PAGE_SIZE = 10
  const [pageByMetric, setPageByMetric] = useState<Record<string, number>>({})
  const metricKey = metric ?? ''
  const page = pageByMetric[metricKey] ?? 0
  const { data, isLoading, isFetching } = useDrilldownRows(role, metric, page, PAGE_SIZE)
  const rows = data?.rows ?? []
  const totalRows = data?.total ?? rows.length
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalRows / PAGE_SIZE)), [totalRows, PAGE_SIZE])

  if (!metric) {
    return null
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-full max-w-xl border-l border-[var(--border-subtle)] bg-white p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="m-0 text-xs uppercase tracking-wider text-neutral-500">Drill-down</p>
          <h3 className="m-0 text-lg font-semibold text-neutral-900">{metric}</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-md border border-[var(--border-default)] p-2">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[80vh] overflow-auto">
        <DataTable<DrilldownRow>
          columns={[
            { key: 'entity', header: 'Entity' },
            {
              key: 'amount',
              header: 'Amount',
              render: (value) => formatKpiValue(Number(value), 'currency'),
            },
            { key: 'status', header: 'Status' },
            { key: 'date', header: 'Date' },
          ]}
          rows={rows}
          exportFilename={`drilldown-${metric.toLowerCase().replace(/\s+/g, '-')}`}
          searchPlaceholder="Search current page..."
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          loadingLabel={isFetching ? 'Refreshing rows...' : 'Loading rows...'}
          skeletonRowCount={6}
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-neutral-600">
        <button
          type="button"
          className="rounded border border-[var(--border-default)] px-2 py-1 disabled:opacity-50"
          disabled={page <= 0 || isFetching}
          onClick={() =>
            setPageByMetric((state) => ({
              ...state,
              [metricKey]: Math.max(0, page - 1),
            }))
          }
        >
          Prev page
        </button>
        <span>
          {page + 1}/{totalPages}
        </span>
        <button
          type="button"
          className="rounded border border-[var(--border-default)] px-2 py-1 disabled:opacity-50"
          disabled={page + 1 >= totalPages || isFetching}
          onClick={() =>
            setPageByMetric((state) => ({
              ...state,
              [metricKey]: Math.min(totalPages - 1, page + 1),
            }))
          }
        >
          Next page
        </button>
      </div>
    </aside>
  )
}
