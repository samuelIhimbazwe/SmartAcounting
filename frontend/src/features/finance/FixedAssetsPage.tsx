import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createFixedAsset,
  depreciateFixedAsset,
  disposeFixedAsset,
  listFixedAssets,
  type FixedAsset,
} from '../../shared/api/productionFinance'
import { normalizeApiError } from '../../shared/api/errors'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

export function FixedAssetsPage() {
  const { t } = useTranslation()
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [disposeTarget, setDisposeTarget] = useState<FixedAsset | null>(null)
  const [disposeDate, setDisposeDate] = useState(new Date().toISOString().slice(0, 10))
  const [disposeAmount, setDisposeAmount] = useState('')
  const [disposeNotes, setDisposeNotes] = useState('')

  const refresh = useCallback(async () => {
    const page = await listFixedAssets()
    setAssets(page.content ?? [])
  }, [])

  useEffect(() => {
    void refresh()
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false))
  }, [refresh])

  const runDepreciation = async (assetId: string) => {
    setBusyId(assetId)
    setError(null)
    try {
      await depreciateFixedAsset(assetId)
      await refresh()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  const submitDispose = async () => {
    if (!disposeTarget) return
    setBusyId(disposeTarget.id)
    setError(null)
    try {
      await disposeFixedAsset(disposeTarget.id, {
        disposedDate: disposeDate,
        disposalProceeds: Number(disposeAmount) || 0,
        notes: disposeNotes.trim() || undefined,
      })
      setDisposeTarget(null)
      await refresh()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  const columns = useMemo((): DataTableColumn<FixedAsset>[] => [
    { key: 'assetName', header: t('pages.fixedAssets.name') },
    { key: 'status', header: t('common.status'), columnType: 'status' },
    {
      key: 'netBookValue',
      header: t('common.amount'),
      columnType: 'currency',
      render: (_value, row) => Number(row.netBookValue ?? row.cost ?? 0),
    },
  ], [t])

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
          }).then(() => refresh())
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
      <DataTable
        columns={columns}
        rows={assets}
        getRowKey={row => row.id}
        emptyStateLabel={t('common.empty')}
        rowActions={[
          {
            label: 'Run Depreciation',
            onClick: row => void runDepreciation(row.id),
            disabled: row => row.status !== 'ACTIVE' || busyId === row.id,
          },
          {
            label: 'Dispose Asset',
            onClick: row => {
              setDisposeTarget(row)
              setDisposeAmount(String(row.netBookValue ?? row.cost ?? '0'))
              setDisposeNotes('')
            },
            disabled: row => row.status !== 'ACTIVE' || busyId === row.id,
            destructive: true,
          },
        ]}
      />

      {disposeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 space-y-3 shadow-xl">
            <h2 className="text-lg font-semibold">Dispose {disposeTarget.assetName}</h2>
            <label className="block text-sm">
              Disposal date
              <input type="date" className="mt-1 w-full rounded border px-2 py-1.5" value={disposeDate} onChange={(e) => setDisposeDate(e.target.value)} />
            </label>
            <label className="block text-sm">
              Sale amount
              <input type="number" min="0" step="0.01" className="mt-1 w-full rounded border px-2 py-1.5" value={disposeAmount} onChange={(e) => setDisposeAmount(e.target.value)} />
            </label>
            <label className="block text-sm">
              Notes
              <textarea className="mt-1 w-full rounded border px-2 py-1.5 min-h-[4rem]" value={disposeNotes} onChange={(e) => setDisposeNotes(e.target.value)} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setDisposeTarget(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" disabled={busyId === disposeTarget.id} className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50" onClick={() => void submitDispose()}>
                Confirm disposal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
