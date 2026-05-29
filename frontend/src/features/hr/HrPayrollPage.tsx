import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import {
  approvePayrollRun,
  downloadEmployeePayslipFile,
  downloadPayeExportFile,
  getAttendanceSummary,
  getPayrollRunLines,
  listPayrollRuns,
  postPayrollRun,
  preparePayrollRun,
  type AttendanceSummary,
  type PayrollLineRow,
  type PayrollRun,
} from '../../shared/api/hr'
import { apiClient } from '../../shared/api/client'
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
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null)
  const [lines, setLines] = useState<PayrollLineRow[]>([])
  const [linesLoading, setLinesLoading] = useState(false)

  async function load() {
    setError(null)
    const [s, r] = await Promise.all([getAttendanceSummary(period), listPayrollRuns()])
    setSummary(s)
    setRuns(r)
  }

  useEffect(() => {
    load().catch((e) => setError(normalizeApiError(e).message))
  }, [period])

  async function openRunDetail(run: PayrollRun) {
    setSelectedRun(run)
    setLines([])
    setLinesLoading(true)
    try {
      setLines(await getPayrollRunLines(run.id))
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLinesLoading(false)
    }
  }

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

  async function onDownloadPayslips(runId: string) {
    try {
      const { data } = await apiClient.get<Blob>(`/api/v1/hr/payroll/runs/${runId}/payslips`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslips-${runId}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(normalizeApiError(e).message)
    }
  }

  async function onPost(runId: string) {
    setBusy(true)
    try {
      await postPayrollRun(runId)
      await load()
      if (selectedRun?.id === runId) {
        const updated = (await listPayrollRuns()).find((r) => r.id === runId) ?? null
        if (updated) await openRunDetail(updated)
      }
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-2">
        <Users className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">Attendance & payroll</h1>
          <p className="m-0 text-sm text-neutral-600">Rwanda PAYE/RSSB payroll runs from attendance.</p>
        </div>
      </header>

      <label className="block text-sm">
        Period (YYYY-MM)
        <input className="mt-1 rounded border px-2 py-2 font-mono" value={period} onChange={(e) => setPeriod(e.target.value)} pattern="\d{4}-\d{2}" />
      </label>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {summary && (
        <p className="text-sm text-neutral-700">
          Attendance {summary.period}: present <strong>{summary.presentCount}</strong>, absent <strong>{summary.absentCount}</strong>, active employees <strong>{summary.activeEmployees}</strong>
        </p>
      )}

      <button type="button" disabled={busy} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white" onClick={() => void onPrepare()}>
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
              <tr key={run.id} className={`border-t border-[var(--border-subtle)] ${selectedRun?.id === run.id ? 'bg-indigo-50' : ''}`}>
                <td className="px-3 py-2">
                  <button type="button" className="text-indigo-700 hover:underline" onClick={() => void openRunDetail(run)}>
                    {run.period}
                  </button>
                </td>
                <td className="px-3 py-2">{run.status}</td>
                <td className="px-3 py-2">{run.totalGross != null ? `${run.totalGross.toLocaleString()} ${run.currencyCode ?? 'RWF'}` : '—'}</td>
                <td className="px-3 py-2 flex flex-wrap gap-2">
                  {run.status === 'DRAFT' && (
                    <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => void onApprove(run.id)}>Approve</button>
                  )}
                  {run.status === 'APPROVED' && (
                    <>
                      <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => void onPost(run.id)}>Post to GL</button>
                      <button type="button" className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-800" onClick={() => void onDownloadPayslips(run.id)}>Download all payslips</button>
                    </>
                  )}
                  {run.status === 'POSTED' && (
                    <button type="button" className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-800" onClick={() => void onDownloadPayslips(run.id)}>Download all payslips</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRun ? (
        <section className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold m-0">Run detail — {selectedRun.period}</h2>
            <div className="flex flex-wrap gap-2">
              {(selectedRun.status === 'APPROVED' || selectedRun.status === 'POSTED') && (
                <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => void downloadPayeExportFile(selectedRun.id, selectedRun.period)}>
                  Export PAYE CSV
                </button>
              )}
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setSelectedRun(null)}>Close</button>
            </div>
          </div>
          {linesLoading ? <p className="text-sm text-slate-500">Loading employees…</p> : null}
          {!linesLoading && lines.length === 0 ? <p className="text-sm text-slate-500">No employee lines on this run.</p> : null}
          {lines.length > 0 ? (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2 pr-3">Employee</th>
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 pr-3 text-right">Gross</th>
                  <th className="py-2 pr-3 text-right">PAYE</th>
                  <th className="py-2 pr-3 text-right">Net</th>
                  <th className="py-2">Payslip</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="py-2 pr-3">{line.employeeName}</td>
                    <td className="py-2 pr-3">{line.department}</td>
                    <td className="py-2 pr-3 text-right">{Number(line.grossSalary).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right">{Number(line.paye).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right">{Number(line.netPay).toLocaleString()}</td>
                    <td className="py-2">
                      <button type="button" className="text-indigo-700 text-xs hover:underline" onClick={() => void downloadEmployeePayslipFile(selectedRun.id, line.employeeId, line.employeeName)}>
                        Download payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
