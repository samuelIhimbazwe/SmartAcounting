import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'
import { cn, isNumericValue } from './utils'

export type SortDirection = 'asc' | 'desc'

export interface TableColumn<T> {
  key: string
  header: string
  accessor: (row: T) => unknown
  render?: (value: unknown, row: T) => ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyState?: ReactNode
  onRowClick?: (row: T) => void
  compact?: boolean
  getRowKey?: (row: T, index: number) => string
  skeletonRows?: number
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (!direction) {
    return <ChevronDown size={12} style={{ opacity: 0.35 }} aria-hidden />
  }
  return direction === 'asc' ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />
}

export function Table<T>({
  columns,
  data,
  loading = false,
  emptyState,
  onRowClick,
  compact = false,
  getRowKey,
  skeletonRows = 5,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const numericColumns = useMemo(() => {
    const set = new Set<string>()
    if (data.length === 0) {
      return set
    }
    for (const col of columns) {
      if (col.align === 'right') {
        set.add(col.key)
        continue
      }
      const sample = data.slice(0, 8).map((row) => col.accessor(row))
      if (sample.length > 0 && sample.every((v) => isNumericValue(v))) {
        set.add(col.key)
      }
    }
    return set
  }, [columns, data])

  const sorted = useMemo(() => {
    if (!sortKey) {
      return data
    }
    const col = columns.find((c) => c.key === sortKey)
    if (!col) {
      return data
    }
    return [...data].sort((a, b) => {
      const left = col.accessor(a)
      const right = col.accessor(b)
      const ln = isNumericValue(left) && isNumericValue(right)
        ? Number(left) - Number(right)
        : String(left ?? '').localeCompare(String(right ?? ''))
      return sortDir === 'asc' ? ln : -ln
    })
  }, [columns, data, sortDir, sortKey])

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  if (!loading && data.length === 0) {
    return (
      <div className="ui-table-wrap">
        {emptyState ?? <EmptyState title="No data" description="There is nothing to show yet." />}
      </div>
    )
  }

  return (
    <div className="ui-table-wrap">
      <table className={cn('ui-table', compact && 'ui-table--compact')}>
        <thead>
          <tr>
            {columns.map((col) => {
              const isNum = numericColumns.has(col.key) || col.align === 'right'
              return (
                <th key={col.key} className={isNum ? 'ui-table__num' : undefined}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className="ui-table__sort"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.header}
                      <SortIcon direction={sortKey === col.key ? sortDir : null} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr key={`sk-${rowIndex}`}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <Skeleton variant="text" height={14} />
                    </td>
                  ))}
                </tr>
              ))
            : sorted.map((row, index) => (
                <tr
                  key={getRowKey?.(row, index) ?? String(index)}
                  className={onRowClick ? 'ui-table__row--clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => {
                    const value = col.accessor(row)
                    const isNum = numericColumns.has(col.key) || col.align === 'right'
                    return (
                      <td key={col.key} className={isNum ? 'ui-table__num' : undefined}>
                        {col.render ? col.render(value, row) : String(value ?? '—')}
                      </td>
                    )
                  })}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
