import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listDocuments } from '../../shared/api/productionFinance'
import { normalizeApiError } from '../../shared/api/errors'

export function DocumentsPage() {
  const { t } = useTranslation()
  const [entityType, setEntityType] = useState('INVOICE')
  const [entityId, setEntityId] = useState('')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{t('nav.documents')}</h1>
      <div className="flex flex-col sm:flex-row gap-2">
        <select className="border rounded-lg px-3 py-2" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="INVOICE">Invoice</option>
          <option value="PURCHASE_ORDER">Purchase order</option>
          <option value="CONTRACT">Contract</option>
        </select>
        <input
          className="border rounded-lg px-3 py-2 flex-1"
          placeholder={t('pages.documents.entityId')}
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        />
        <button
          type="button"
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm"
          onClick={() => {
            if (!entityId) return
            void listDocuments(entityType, entityId)
              .then(setRows)
              .catch((e) => setError(normalizeApiError(e).message))
          }}
        >
          {t('common.search')}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="rounded-xl border bg-white divide-y text-sm">
        {rows.map((r, i) => (
          <li key={i} className="px-4 py-2">
            {String(r.fileName ?? r.id ?? 'document')}
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-slate-500">{t('common.empty')}</p> : null}
    </div>
  )
}

