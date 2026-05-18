import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createWorkflowRule, listWorkflowRules, type WorkflowRule } from '../../shared/api/productionFinance'
import { normalizeApiError } from '../../shared/api/errors'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

export function WorkflowRulesPage() {
  const { t } = useTranslation()
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    void listWorkflowRules()
      .then(setRules)
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{t('nav.workflowRules')}</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void createWorkflowRule({
            name,
            triggerEvent: 'INVOICE_CREATED',
            conditions: { amountGt: 1000 },
            actions: { notifyRole: 'CFO' },
            active: true,
          }).then(() => listWorkflowRules().then(setRules))
        }}
      >
        <input className="border rounded-lg px-3 py-2 flex-1" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm">
          {t('common.add')}
        </button>
      </form>
      <ul className="divide-y rounded-xl border bg-white">
        {rules.map((r) => (
          <li key={r.id} className="px-4 py-3 text-sm flex justify-between">
            <span>{r.name}</span>
            <span className="text-slate-500">{r.triggerEvent}</span>
          </li>
        ))}
      </ul>
      {rules.length === 0 ? <p className="text-sm text-slate-500">{t('common.empty')}</p> : null}
    </div>
  )
}

