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
      <div className="flex items-center gap-4">
        <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
          <circle cx="44" cy="44" r="36" fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r="36"
            fill="none"
            stroke="#4F46E5"
            strokeWidth="8"
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
            strokeDasharray={2 * Math.PI * 36}
            strokeDashoffset={2 * Math.PI * 36 * (1 - pct / 100)}
          />
        </svg>
        <p className="text-sm font-medium">{pct}% {t('pages.close.complete')}</p>
      </div>
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

