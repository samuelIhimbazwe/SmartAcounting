import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import {
  EmptyState,
  Input,
  Table,
  type BadgeVariant,
  type TableColumn,
} from '../../../components/ui'
import {
  TableCurrencyCell,
  TableDateCell,
  TableNumberCell,
  TableStatusBadge,
} from '../../../components/ui/tableFormat'
import {
  TablePrimaryLink,
  TableRowActionsMenu,
  type TableRowAction,
} from '../../../components/ui/TableRowActionsMenu'
import { exportRowsToCsv, exportRowsToExcel } from '../../utils/export'
import { Pagination } from './Pagination'
import { Button } from './Button'

export interface DataTableColumn<T> {
  key: keyof T & string
  header: string
  render?: (value: T[keyof T], row: T) => ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  columnType?: 'text' | 'number' | 'currency' | 'date' | 'status'
  statusVariant?: (value: T[keyof T], row: T) => BadgeVariant
}

export interface DataTableRowAction<T> {
  label: string
  onClick: (row: T) => void
  disabled?: (row: T) => boolean
  destructive?: boolean
}

export interface DataTablePrimaryAction<T> {
  label: string | ((row: T) => string)
  href?: (row: T) => string
  onClick?: (row: T) => void
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
  skeletonRowCount?: number
  getRowKey?: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  rowActions?: DataTableRowAction<T>[]
  primaryAction?: DataTablePrimaryAction<T>
  compact?: boolean
}

const SEARCH_THRESHOLD = 10

function defaultRender<T>(
  column: DataTableColumn<T>,
  value: T[keyof T],
  row: T,
): ReactNode {
  if (column.render) {
    return column.render(value, row)
  }
  switch (column.columnType) {
    case 'currency':
      return <TableCurrencyCell value={value as number} />
    case 'number':
      return <TableNumberCell value={value as number} />
    case 'date':
      return <TableDateCell value={value as string} />
    case 'status':
      return (
        <TableStatusBadge
          value={String(value ?? '')}
          variant={column.statusVariant?.(value, row)}
        />
      )
    default:
      return String(value ?? '—')
  }
}

export function DataTable<T extends object>({
  columns,
  rows,
  searchPlaceholder = 'Search rows…',
  searchAriaLabel = 'Search table rows',
  showSearch,
  showPagination = true,
  tableAriaLabel: _tableAriaLabel = 'Data table',
  pageSize = 10,
  exportFilename,
  emptyStateLabel = 'No rows to display',
  noResultsLabel = 'No rows match your search',
  isLoading = false,
  skeletonRowCount,
  getRowKey,
  onRowClick,
  rowActions,
  primaryAction,
  compact = false,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const shouldShowSearch = showSearch ?? rows.length > SEARCH_THRESHOLD

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    if (!lowered) {
      return rows
    }
    return rows.filter(row =>
      Object.values(row as Record<string, unknown>).some(value =>
        String(value ?? '')
          .toLowerCase()
          .includes(lowered),
      ),
    )
  }, [query, rows])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = showPagination
    ? filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filtered

  const tableColumns = useMemo((): TableColumn<T>[] => {
    const mapped: TableColumn<T>[] = columns.map(column => ({
      key: String(column.key),
      header: column.header,
      accessor: (row: T) => row[column.key],
      sortable: column.sortable !== false,
      align: column.align ?? (column.columnType === 'currency' || column.columnType === 'number' ? 'right' : 'left'),
      render: (value: unknown, row: T) => defaultRender(column, value as T[keyof T], row),
    }))

    if (primaryAction || (rowActions && rowActions.length > 0)) {
      mapped.push({
        key: '__actions',
        header: '',
        accessor: () => null,
        sortable: false,
        align: 'right',
        render: (_value: unknown, row: T) => (
          <div className="flex items-center justify-end gap-2">
            {primaryAction ? (
              <TablePrimaryLink
                label={
                  typeof primaryAction.label === 'function'
                    ? primaryAction.label(row)
                    : primaryAction.label
                }
                href={primaryAction.href?.(row)}
                onClick={primaryAction.onClick ? () => primaryAction.onClick?.(row) : undefined}
              />
            ) : null}
            {rowActions && rowActions.length > 0 ? (
              <TableRowActionsMenu
                actions={rowActions.map(
                  (action): TableRowAction => ({
                    label: action.label,
                    disabled: action.disabled?.(row),
                    destructive: action.destructive,
                    onClick: () => action.onClick(row),
                  }),
                )}
              />
            ) : null}
          </div>
        ),
      })
    }

    return mapped
  }, [columns, primaryAction, rowActions])

  const exportedRows = filtered.map(row => ({ ...(row as Record<string, unknown>) }))
  const hasAnyRows = rows.length > 0
  const hasFilteredRows = filtered.length > 0
  const visibleSkeletonRows = Math.max(1, skeletonRowCount ?? Math.min(pageSize, 5))

  const emptyState = !hasAnyRows ? (
    <EmptyState title={emptyStateLabel} description="Add records to see them listed here." />
  ) : (
    <EmptyState title={noResultsLabel} description="Try adjusting your search or filters." />
  )

  return (
    <div>
      {(shouldShowSearch || exportFilename) && (
        <div className="ui-table-toolbar">
          {shouldShowSearch ? (
            <div className="ui-table-toolbar__search">
              <Input
                placeholder={searchPlaceholder}
                aria-label={searchAriaLabel}
                value={query}
                disabled={isLoading}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          ) : (
            <span />
          )}
          {exportFilename ? (
            <div className="ui-table-toolbar__exports">
              <Button
                size="sm"
                variant="ghost"
                disabled={!hasFilteredRows || isLoading}
                onClick={() => exportRowsToCsv(exportedRows, exportFilename)}
              >
                <Download className="mr-1 inline h-3 w-3" />
                CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!hasFilteredRows || isLoading}
                onClick={() => void exportRowsToExcel(exportedRows, exportFilename)}
              >
                <Download className="mr-1 inline h-3 w-3" />
                Excel
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <p className="ui-table-toolbar__meta" role="status" aria-live="polite">
        {isLoading
          ? 'Loading…'
          : `Showing ${isLoading ? visibleSkeletonRows : pagedRows.length} of ${filtered.length} ${filtered.length === 1 ? 'row' : 'rows'}`}
      </p>

      <Table
        columns={tableColumns}
        data={pagedRows}
        loading={isLoading}
        emptyState={emptyState}
        onRowClick={onRowClick}
        compact={compact}
        getRowKey={getRowKey}
        skeletonRows={visibleSkeletonRows}
      />

      {showPagination && hasFilteredRows && !isLoading ? (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          disabled={isLoading}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
