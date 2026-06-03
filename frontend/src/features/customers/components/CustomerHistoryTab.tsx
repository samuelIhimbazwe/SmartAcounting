import { useMemo } from 'react'
import { type CustomerSaleRow } from '../../../shared/api/customers'
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/DataTable'

export interface CustomerHistoryTabProps {
  sales: CustomerSaleRow[]
  loading: boolean
}

export function CustomerHistoryTab({ sales, loading }: CustomerHistoryTabProps) {
  const columns = useMemo((): DataTableColumn<CustomerSaleRow>[] => [
    { key: 'createdAt', header: 'Date', columnType: 'date' },
    {
      key: 'itemSummary',
      header: 'Items summary',
      render: (_v, row) => row.itemSummary ?? 'POS sale',
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      columnType: 'currency',
      render: (_v, row) => (
        <span>
          {new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: row.currencyCode ?? 'RWF',
            maximumFractionDigits: 0,
          }).format(Number(row.totalAmount ?? 0))}
        </span>
      ),
    },
    { key: 'paymentMethod', header: 'Payment', render: v => String(v ?? '—') },
  ], [])

  return (
    <DataTable
      columns={columns}
      rows={sales}
      isLoading={loading}
      getRowKey={row => row.salesOrderId}
      primaryAction={{
        label: 'View receipt',
        href: row => `/pos/receipts/${row.salesOrderId}/print`,
      }}
      emptyStateLabel="No purchases recorded for this customer yet"
      noResultsLabel="No purchases match your search"
      showSearch={false}
      exportFilename="customer-purchase-history"
    />
  )
}
