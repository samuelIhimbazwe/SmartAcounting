import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import {
  exportPayeCsv,
  listPayeFilingLog,
  listPayrollRunsForPaye,
  type PayeFilingLogRow,
  type PayrollRunPayeSummary,
} from '../../shared/api/compliance'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { ComplianceSubNav } from './ComplianceSubNav'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function money(n: number | undefined) {
  if (n == null || Number.isNaN(Number(n))) {
    return '—'
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n))
}

export function PayePage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [runs, setRuns] = useState<PayrollRunPayeSummary[]>([])
  const [filingLog, setFilingLog] = useState<PayeFilingLogRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setError(null)
    const [runData, logs] = await Promise.all([listPayrollRunsForPaye(), listPayeFilingLog()])
    setRuns(runData)
    setFilingLog(logs)
  }

  useEffect(() => {
    load().catch((e) => setError(normalizeApiError(e).message))
  }, [])

  const periodRuns = useMemo(() => runs.filter((r) => r.period === period), [runs, period])
  const summary = useMemo(() => {
    const posted = periodRuns.filter((r) => r.status === 'POSTED' || r.status === 'APPROVED')
    const source = posted.length > 0 ? posted : periodRuns
    return {
      employeeCount: source.reduce((s, r) => s + (r.employeeCount ?? 0), 0),
      totalGross: source.reduce((s, r) => s + Number(r.totalGross ?? 0), 0),
      totalPaye: source.reduce((s, r) => s + Number(r.totalPaye ?? 0), 0),
      totalRssbEmployer: source.reduce((s, r) => s + Number(r.totalRssbEmployer ?? 0), 0),
      totalRssbEmployee: source.reduce((s, r) => s + Number(r.totalRssbEmployee ?? 0), 0),
      exportRunId: source.find((r) => r.status === 'POSTED' || r.status === 'APPROVED')?.id ?? source[0]?.id,
    }
  }, [periodRuns])

  const filingColumns = useMemo((): DataTableColumn<PayeFilingLogRow>[] => [
    {
      key: 'period',
      header: 'Period',
      render: value => <span className="font-mono">{String(value ?? '—')}</span>,
    },
    { key: 'status', header: 'Status', columnType: 'status' },
    { key: 'rowCount', header: 'Rows', columnType: 'number' },
    {
      key: 'fileFormat',
      header: 'Format',
      render: value => <span className="text-xs">{String(value ?? '—')}</span>,
    },
    {
      key: 'createdAt',
      header: 'Exported',
      columnType: 'date',
      render: value => (value ? formatDate(String(value)) : '—'),
    },
  ], [])

  async function onExport() {
    if (!summary.exportRunId) {
      setError('No payroll run available for this period. Prepare and post payroll first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const blob = await exportPayeCsv(summary.exportRunId, period)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paye-${period}.csv`
      a.click()
      URL.revokeObjectURL(url)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ComplianceSubNav />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">PAYE filing</h1>
            <p className="m-0 text-sm text-neutral-600">Monthly PAYE and RSSB summary for RRA e-tax export.</p>
          </div>
        </div>
        <label className="text-sm">
          Period
          <input
            className="mt-1 block rounded border px-2 py-2 font-mono"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            pattern="\d{4}-\d{2}"
          />
        </label>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Employee count', summary.employeeCount],
          ['Total gross pay', money(summary.totalGross)],
          ['Total PAYE deducted', money(summary.totalPaye)],
          ['RSSB employer', money(summary.totalRssbEmployer)],
          ['RSSB employee', money(summary.totalRssbEmployee)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-neutral-50 p-4">
            <p className="m-0 text-xs uppercase tracking-wide text-neutral-500">{label}</p>
            <p className="m-0 mt-1 text-xl font-semibold text-neutral-900">{value}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy || !summary.exportRunId}
        onClick={() => void onExport()}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white"
      >
        Export PAYE CSV
      </button>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-neutral-900">Submission history</h2>
        <DataTable
          columns={filingColumns}
          rows={filingLog}
          getRowKey={row => row.id}
          emptyStateLabel="No PAYE exports yet. Export a CSV to record a filing log entry."
        />
      </section>
    </div>
  )
}
