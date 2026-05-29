import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import {
  fetchVatCalendar,
  listRraFilings,
  parseVatDraft,
  refreshVatReturn,
  submitVatReturn,
  type VatCalendarEntry,
} from '../../shared/api/compliance'
import { normalizeApiError } from '../../shared/api/errors'
import { exportRowsToExcel } from '../../shared/utils/export'
import { ComplianceSubNav } from './ComplianceSubNav'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function money(n: number | undefined) {
  if (n == null || Number.isNaN(n)) {
    return '—'
  }
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n)
}

function calendarStatusClass(entry: VatCalendarEntry) {
  const due = new Date(entry.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const status = (entry.status || 'PENDING').toUpperCase()
  if (status === 'SUBMITTED' || status === 'FILED') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-900'
  }
  if (due < today) {
    return 'border-red-300 bg-red-50 text-red-900'
  }
  return 'border-amber-300 bg-amber-50 text-amber-900'
}

export function VatPage() {
  const [calendar, setCalendar] = useState<VatCalendarEntry[]>([])
  const [period, setPeriod] = useState(currentPeriod())
  const [year, month] = period.split('-')
  const [outputVat, setOutputVat] = useState<number | undefined>()
  const [inputVat, setInputVat] = useState<number | undefined>()
  const [netVat, setNetVat] = useState<number | undefined>()
  const [filingStatus, setFilingStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadWorkbook = useCallback(async () => {
    const filings = await listRraFilings(period)
    const vat = filings.find((f) => f.filingType === 'VAT')
    const draft = parseVatDraft(vat)
    setOutputVat(draft?.outputVat)
    setInputVat(draft?.inputVatCredit)
    setNetVat(draft?.netVatPayable)
    setFilingStatus(vat?.status ?? null)
  }, [period])

  useEffect(() => {
    setError(null)
    Promise.all([fetchVatCalendar(), loadWorkbook()])
      .then(([cal]) => setCalendar(cal))
      .catch((e) => setError(normalizeApiError(e).message))
  }, [loadWorkbook])

  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')), [])
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 1, y, y + 1].map(String)
  }, [])

  function setPeriodFromParts(nextYear: string, nextMonth: string) {
    setPeriod(`${nextYear}-${nextMonth}`)
  }

  async function onRefreshWorkbook() {
    setBusy(true)
    setError(null)
    try {
      await refreshVatReturn(period)
      await loadWorkbook()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  async function onDownloadWorkbook() {
    await onRefreshWorkbook()
    await exportRowsToExcel(
      [
        {
          period,
          outputVat: outputVat ?? 0,
          inputVat: inputVat ?? 0,
          netVatPayable: netVat ?? 0,
          status: filingStatus ?? 'DRAFT',
        },
      ],
      `vat-workbook-${period}`,
    )
  }

  async function onMarkSubmitted() {
    setBusy(true)
    setError(null)
    try {
      await refreshVatReturn(period)
      await submitVatReturn(period)
      const [cal] = await Promise.all([fetchVatCalendar(), loadWorkbook()])
      setCalendar(cal)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <ComplianceSubNav />
      <header className="flex items-center gap-2">
        <FileSpreadsheet className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">VAT returns</h1>
          <p className="m-0 text-sm text-neutral-600">Filing calendar and monthly VAT return workbook.</p>
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">VAT filing calendar</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {calendar.map((entry) => (
            <article
              key={entry.period}
              className={`rounded-xl border p-4 ${calendarStatusClass(entry)}`}
            >
              <p className="m-0 font-semibold">{entry.period}</p>
              <p className="m-0 mt-1 text-sm">Due {entry.dueDate}</p>
              <p className="m-0 mt-1 text-xs uppercase tracking-wide">{entry.status || 'PENDING'}</p>
              {entry.referenceNumber ? (
                <p className="m-0 mt-1 text-xs">Ref {entry.referenceNumber}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <h2 className="text-lg font-semibold text-neutral-900">VAT return workbook</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Month
            <select
              className="mt-1 block rounded border px-2 py-2"
              value={month}
              onChange={(e) => setPeriodFromParts(year, e.target.value)}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Year
            <select
              className="mt-1 block rounded border px-2 py-2"
              value={year}
              onChange={(e) => setPeriodFromParts(e.target.value, month)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onRefreshWorkbook()}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Refresh figures
          </button>
        </div>

        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2">Line</th>
              <th className="px-3 py-2 text-right">Amount (RWF)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-3 py-2">Output VAT (sales)</td>
              <td className="px-3 py-2 text-right font-mono">{money(outputVat)}</td>
            </tr>
            <tr className="border-t">
              <td className="px-3 py-2">Input VAT (purchases)</td>
              <td className="px-3 py-2 text-right font-mono">{money(inputVat)}</td>
            </tr>
            <tr className="border-t font-semibold">
              <td className="px-3 py-2">Net VAT payable</td>
              <td className="px-3 py-2 text-right font-mono">{money(netVat)}</td>
            </tr>
          </tbody>
        </table>
        {filingStatus ? (
          <p className="text-xs text-neutral-600">Filing status: {filingStatus}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDownloadWorkbook()}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Download VAT workbook
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onMarkSubmitted()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white"
          >
            Mark as submitted
          </button>
        </div>
      </section>
    </div>
  )
}
