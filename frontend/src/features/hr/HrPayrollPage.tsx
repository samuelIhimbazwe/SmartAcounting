import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
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

  const runColumns = useMemo((): DataTableColumn<PayrollRun>[] => [
    { key: 'period', header: 'Period' },
    { key: 'status', header: 'Status', columnType: 'status' },
    {
      key: 'totalGross',
      header: 'Gross',
      render: (_v, run) =>
        run.totalGross != null ? `${run.totalGross.toLocaleString()} ${run.currencyCode ?? 'RWF'}` : '—',
    },
  ], [])

  const lineColumns = useMemo((): DataTableColumn<PayrollLineRow>[] => [
    { key: 'employeeName', header: 'Employee' },
    { key: 'department', header: 'Department' },
    {
      key: 'grossSalary',
      header: 'Gross',
      columnType: 'number',
      render: v => Number(v).toLocaleString(),
    },
    {
      key: 'paye',
      header: 'PAYE',
      columnType: 'number',
      render: v => Number(v).toLocaleString(),
    },
    {
      key: 'netPay',
      header: 'Net',
      columnType: 'number',
      render: v => Number(v).toLocaleString(),
    },
    {
      key: 'id',
      header: 'Payslip',
      sortable: false,
      render: (_v, line) =>
        selectedRun ? (
          <button
            type="button"
            className="text-indigo-700 text-xs hover:underline"
            onClick={() => void downloadEmployeePayslipFile(selectedRun.id, line.employeeId, line.employeeName)}
          >
            Download payslip
          </button>
        ) : null,
    },
  ], [selectedRun])

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

      <DataTable
        columns={runColumns}
        rows={runs}
        getRowKey={row => row.id}
        onRowClick={run => void openRunDetail(run)}
        rowActions={[
          {
            label: 'Approve',
            onClick: run => void onApprove(run.id),
            disabled: run => run.status !== 'DRAFT' || busy,
          },
          {
            label: 'Post to GL',
            onClick: run => void onPost(run.id),
            disabled: run => run.status !== 'APPROVED' || busy,
          },
          {
            label: 'Download all payslips',
            onClick: run => void onDownloadPayslips(run.id),
            disabled: run => run.status !== 'APPROVED' && run.status !== 'POSTED',
          },
        ]}
        showSearch={false}
        emptyStateLabel="No payroll runs yet"
        noResultsLabel="No payroll runs match your filters"
      />

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
          {lines.length > 0 ? (
            <DataTable
              columns={lineColumns}
              rows={lines}
              isLoading={linesLoading}
              getRowKey={row => row.id}
              showSearch={false}
              emptyStateLabel="No employee lines on this run"
              noResultsLabel="No employee lines on this run"
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
