import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import {
  approvePayrollRun,
  getAttendanceSummary,
  listPayrollRuns,
  postPayrollRun,
  preparePayrollRun,
  type AttendanceSummary,
  type PayrollRun,
} from '../../shared/api/hr'
import { normalizeApiError } from '../../shared/api/errors'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function HrPayrollPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setError(null)
    const [s, r] = await Promise.all([getAttendanceSummary(period), listPayrollRuns()])
    setSummary(s)
    setRuns(r)
  }

  useEffect(() => {
    load().catch((e) => setError(normalizeApiError(e).message))
  }, [period])

  async function onPrepare() {
    setBusy(true)
    try {
      await preparePayrollRun(period)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  async function onApprove(runId: string) {
    setBusy(true)
    try {
      await approvePayrollRun(runId)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  async function onPost(runId: string) {
    setBusy(true)
    try {
      await postPayrollRun(runId)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-2">
        <Users className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">Attendance & payroll</h1>
          <p className="m-0 text-sm text-neutral-600">Rwanda PAYE/RSSB payroll runs from attendance (Sprint 1.3).</p>
        </div>
      </header>

      <label className="block text-sm">
        Period (YYYY-MM)
        <input
          className="mt-1 rounded border px-2 py-2 font-mono"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          pattern="\d{4}-\d{2}"
        />
      </label>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {summary && (
        <p className="text-sm text-neutral-700">
          Attendance {summary.period}: present <strong>{summary.presentCount}</strong>, absent{' '}
          <strong>{summary.absentCount}</strong>, active employees <strong>{summary.activeEmployees}</strong>
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        onClick={() => void onPrepare()}
      >
        Prepare payroll run
      </button>

      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Gross</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">{run.period}</td>
                <td className="px-3 py-2">{run.status}</td>
                <td className="px-3 py-2">
                  {run.totalGross != null ? `${run.totalGross.toLocaleString()} ${run.currencyCode ?? 'RWF'}` : '—'}
                </td>
                <td className="px-3 py-2 space-x-2">
                  {run.status === 'DRAFT' && (
                    <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => void onApprove(run.id)}>
                      Approve
                    </button>
                  )}
                  {run.status === 'APPROVED' && (
                    <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => void onPost(run.id)}>
                      Post to GL
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
