import { useCallback, useEffect, useMemo, useState } from 'react'
import { listPromotions, type PromotionRow } from '../../shared/api/marketing'
import { normalizeApiError } from '../../shared/api/errors'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

export function PromotionsPage() {
  const [rows, setRows] = useState<PromotionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listPromotions())
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const columns = useMemo((): DataTableColumn<PromotionRow>[] => [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'status', header: 'Status', columnType: 'status' },
    {
      key: 'discountValue',
      header: 'Discount',
      render: (_value, row) =>
        row.discountValue != null
          ? `${row.discountValue}${row.discountType === 'PERCENT' ? '%' : ' FRW'}`
          : '—',
    },
  ], [])

  if (loading && rows.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="page-stack">
      <header>
        <h1>Promotions</h1>
        <p className="text-neutral-500">Active and scheduled promotion rules.</p>
      </header>
      {error ? <p className="text-red-600">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={rows}
        isLoading={loading}
        getRowKey={row => row.id}
        emptyStateLabel="No promotions yet"
        exportFilename="promotions"
      />
    </div>
  )
}
