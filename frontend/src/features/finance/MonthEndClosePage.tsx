import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { completeCloseTask, createCloseTask, listCloseTasks, type CloseTask } from '../../shared/api/productionFinance'
import { normalizeApiError } from '../../shared/api/errors'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'task'
}

export function MonthEndClosePage() {
  const { t } = useTranslation()
  const period = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const [tasks, setTasks] = useState<CloseTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [assignedTo, setAssignedTo] = useState('ACCOUNTING')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = () => listCloseTasks(period).then(setTasks)

  useEffect(() => {
    void reload()
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false))
  }, [period])

  const done = tasks.filter((x) => x.status === 'DONE').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  const submitTask = async () => {
    if (!taskName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const key = `${slugify(taskName)}${dueDate ? `-${dueDate}` : ''}`
      await createCloseTask({
        period,
        taskKey: key,
        ownerRole: assignedTo,
        dependsOn: dueDate ? [`due:${dueDate}`] : [],
        riskScore: 1,
      })
      setModalOpen(false)
      setTaskName('')
      setDueDate('')
      await reload()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.monthEndClose')}</h1>
        <button type="button" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white" onClick={() => setModalOpen(true)}>
          + Add task
        </button>
      </div>
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
            <span>{task.title ?? task.taskKey.replace(/-/g, ' ')}</span>
            {task.status !== 'DONE' ? (
              <button
                type="button"
                className="text-indigo-600"
                onClick={() => void completeCloseTask(period, task.taskKey).then(() => reload())}
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

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 space-y-3 shadow-xl">
            <h2 className="text-lg font-semibold">Add close task</h2>
            <label className="block text-sm">
              Task name
              <input className="mt-1 w-full rounded border px-2 py-1.5" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
            </label>
            <label className="block text-sm">
              Assigned to
              <select className="mt-1 w-full rounded border px-2 py-1.5" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="ACCOUNTING">Accounting</option>
                <option value="CFO">CFO</option>
                <option value="HR">HR</option>
                <option value="OPERATIONS">Operations</option>
              </select>
            </label>
            <label className="block text-sm">
              Due date
              <input type="date" className="mt-1 w-full rounded border px-2 py-1.5" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setModalOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" disabled={busy || !taskName.trim()} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50" onClick={() => void submitTask()}>
                Save task
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
