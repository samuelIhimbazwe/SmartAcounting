import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createFixedAsset, listFixedAssets, type FixedAsset } from '../../shared/api/productionFinance'
import { normalizeApiError } from '../../shared/api/errors'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

export function FixedAssetsPage() {
  const { t } = useTranslation()
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const page = await listFixedAssets()
        setAssets(page.content ?? [])
      } catch (e) {
        setError(normalizeApiError(e).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{t('nav.fixedAssets')}</h1>
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void createFixedAsset({
            assetName: name,
            category: 'EQUIPMENT',
            purchaseDate: new Date().toISOString().slice(0, 10),
            cost: 1000,
            usefulLifeYears: 5,
            depreciationMethod: 'STRAIGHT_LINE',
          }).then(() => listFixedAssets().then((p) => setAssets(p.content ?? [])))
        }}
      >
        <input
          className="border rounded-lg px-3 py-2 flex-1"
          placeholder={t('pages.fixedAssets.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm">
          {t('common.add')}
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">{t('pages.fixedAssets.name')}</th>
              <th className="px-3 py-2 text-left">{t('common.status')}</th>
              <th className="px-3 py-2 text-right">{t('common.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2">{a.assetName}</td>
                <td className="px-3 py-2">{a.status}</td>
                <td className="px-3 py-2 text-right">{a.netBookValue ?? a.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {assets.length === 0 ? <p className="p-4 text-slate-500 text-sm">{t('common.empty')}</p> : null}
      </div>
    </div>
  )
}

