import { useMemo, useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import { exportRowsToCsv, exportRowsToExcel } from '../../utils/export'

export interface DataTableColumn<T> {
  key: keyof T
  header: string
  render?: (value: T[keyof T], row: T) => ReactNode
}

interface DataTableProps<T extends object> {
  columns: DataTableColumn<T>[]
  rows: T[]
  searchPlaceholder?: string
  searchAriaLabel?: string
  showSearch?: boolean
  showPagination?: boolean
  tableAriaLabel?: string
  pageSize?: number
  exportFilename?: string
  emptyStateLabel?: string
  noResultsLabel?: string
  isLoading?: boolean
  loadingLabel?: string
  skeletonRowCount?: number
}

type SortDirection = 'asc' | 'desc'

export function DataTable<T extends object>({
  columns,
  rows,
  searchPlaceholder = 'Search rows...',
  searchAriaLabel = 'Search table rows',
  showSearch = true,
  showPagination = true,
  tableAriaLabel = 'Data table',
  pageSize = 8,
  exportFilename,
  emptyStateLabel = 'No rows to display.',
  noResultsLabel = 'No rows match your search.',
  isLoading = false,
  loadingLabel = 'Loading rows...',
  skeletonRowCount,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    const scoped = lowered
      ? rows.filter((row) =>
          Object.values(row as Record<string, unknown>).some((value) =>
            String(value ?? '')
              .toLowerCase()
              .includes(lowered),
          ),
        )
      : rows

    if (!sortKey) {
      return scoped
    }

    return [...scoped].sort((a, b) => {
      const left = String(a[sortKey] ?? '')
      const right = String(b[sortKey] ?? '')
      return sortDirection === 'asc' ? left.localeCompare(right) : right.localeCompare(left)
    })
  }, [query, rows, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = showPagination ? filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize) : filtered
  const exportedRows = filtered.map((row) => ({ ...(row as Record<string, unknown>) }))
  const hasAnyRows = rows.length > 0
  const hasFilteredRows = filtered.length > 0
  const visibleSkeletonRows = Math.max(1, skeletonRowCount ?? Math.min(pageSize, 5))
  const showingCount = isLoading ? visibleSkeletonRows : pagedRows.length

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {showSearch ? (
          <input
            className="w-full max-w-sm rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            disabled={isLoading}
          />
        ) : (
          <span />
        )}
        {exportFilename && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-neutral-700 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50"
              onClick={() => exportRowsToCsv(exportedRows, exportFilename)}
              disabled={!hasFilteredRows || isLoading}
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-neutral-700 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50"
              onClick={() => void exportRowsToExcel(exportedRows, exportFilename)}
              disabled={!hasFilteredRows || isLoading}
            >
              <Download className="h-3 w-3" />
              Excel
            </button>
          </div>
        )}
      </div>
      <p className="mb-2 text-xs text-neutral-500" role="status" aria-live="polite">
        {isLoading
          ? loadingLabel
          : `Showing ${showingCount} of ${filtered.length} ${filtered.length === 1 ? 'row' : 'rows'}`}
      </p>

      <div className="overflow-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full border-collapse text-sm" aria-label={tableAriaLabel}>
          <thead className="bg-[var(--surface-overlay)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-3 py-2 text-left"
                  scope="col"
                  aria-sort={sortKey !== column.key ? 'none' : sortDirection === 'asc' ? 'ascending' : 'descending'}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-sm text-left text-inherit transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    onClick={() => {
                      if (sortKey === column.key) {
                        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
                      } else {
                        setSortKey(column.key)
                        setSortDirection('asc')
                      }
                    }}
                    aria-label={`Sort by ${column.header}`}
                  >
                    {column.header}
                    {sortKey === column.key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: visibleSkeletonRows }, (_, rowIdx) => (
                <tr key={`skeleton-${rowIdx}`} className="border-t border-[var(--border-subtle)]">
                  {columns.map((column) => (
                    <td key={`${String(column.key)}-${rowIdx}`} className="px-3 py-2">
                      <span className="block h-4 w-full animate-pulse rounded bg-[var(--surface-overlay)]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !hasFilteredRows ? (
              <tr className="border-t border-[var(--border-subtle)]">
                <td colSpan={columns.length} className="px-3 py-5 text-center text-sm text-neutral-500">
                  {hasAnyRows ? noResultsLabel : emptyStateLabel}
                </td>
              </tr>
            ) : (
              pagedRows.map((row, idx) => (
                <tr key={idx} className="border-t border-[var(--border-subtle)]">
                  {columns.map((column) => {
                    const value = row[column.key]
                    return (
                      <td key={String(column.key)} className="px-3 py-2">
                        {column.render ? column.render(value, row) : String(value ?? '')}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="mt-2 flex items-center justify-end gap-2 text-xs text-neutral-600">
          <button
            type="button"
            className="rounded border border-[var(--border-default)] px-2 py-1 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>
            {currentPage}/{totalPages}
          </span>
          <button
            type="button"
            className="rounded border border-[var(--border-default)] px-2 py-1 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
