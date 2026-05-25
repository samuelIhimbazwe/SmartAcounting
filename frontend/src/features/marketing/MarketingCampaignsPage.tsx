import { useCallback, useEffect, useState } from 'react'
import { listCampaigns, listSegments, type CampaignRow } from '../../shared/api/marketing'
import { normalizeApiError } from '../../shared/api/errors'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

export function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [segments, setSegments] = useState<Array<{ segment: string; customerCount: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, s] = await Promise.all([listCampaigns(), listSegments()])
      setCampaigns(c)
      setSegments(s)
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

  const segmentRows = Array.isArray(segments) ? segments : []
  const campaignRows = Array.isArray(campaigns) ? campaigns : []

  return (
    <div className="page-stack">
      <header>
        <h1>Marketing campaigns</h1>
        <p className="text-neutral-500">Segments and active campaigns from the marketing API.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Customer segments</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {segmentRows.map(s => (
              <li key={s.segment}>
                {s.segment}: {s.customerCount} customers
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {campaignRows.length === 0 ? (
              <li>No campaigns yet.</li>
            ) : (
              campaignRows.map(c => (
                <li key={c.id} className="border-b pb-2">
                  <strong>{c.name}</strong>
                  {c.status ? ` — ${c.status}` : ''}
                  {c.channel ? ` (${c.channel})` : ''}
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </div>
  )
}
