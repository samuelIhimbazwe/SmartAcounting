import { useCallback, useEffect, useState } from 'react'
import { listPromotions, type PromotionRow } from '../../shared/api/marketing'
import { normalizeApiError } from '../../shared/api/errors'
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

  if (loading) return <PageSkeleton />
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div className="page-stack">
      <header>
        <h1>Promotions</h1>
        <p className="text-neutral-500">Active and scheduled promotion rules.</p>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Name</th>
            <th>Code</th>
            <th>Status</th>
            <th>Discount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.name}</td>
              <td>{r.code ?? '—'}</td>
              <td>{r.status ?? '—'}</td>
              <td>
                {r.discountValue != null
                  ? `${r.discountValue}${r.discountType === 'PERCENT' ? '%' : ' FRW'}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
