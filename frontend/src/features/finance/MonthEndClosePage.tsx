import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { completeCloseTask, listCloseTasks, type CloseTask } from '../../shared/api/productionFinance'
import { normalizeApiError } from '../../shared/api/errors'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

export function MonthEndClosePage() {
  const { t } = useTranslation()
  const period = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const [tasks, setTasks] = useState<CloseTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listCloseTasks(period)
      .then(setTasks)
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false))
  }, [period])

  const done = tasks.filter((x) => x.status === 'DONE').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{t('nav.monthEndClose')}</h1>
      <p className="text-sm text-slate-600">{period}</p>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm">{pct}% {t('pages.close.complete')}</p>
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
            <span>{task.title ?? task.taskKey}</span>
            {task.status !== 'DONE' ? (
              <button
                type="button"
                className="text-indigo-600"
                onClick={() => void completeCloseTask(period, task.taskKey).then(() =>
                  listCloseTasks(period).then(setTasks),
                )}
              >
                {t('pages.close.markDone')}
              </button>
            ) : (
              <span className="text-emerald-600">{t('common.done')}</span>
            )}
          </li>
        ))}
      </ul>
      {tasks.length === 0 ? <p className="text-sm text-slate-500">{t('common.empty')}</p> : null}
    </div>
  )
}

