import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { EfdStatusBadge } from '../../components/fiscal/EfdStatusBadge'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import {
  getEbmConfig,
  getEbmReport,
  listEbmReceipts,
  retryEbmReceipt,
  saveEbmConfig,
  type EbmComplianceReport,
  type EbmConfig,
  type EbmReceipt,
} from '../../shared/api/ebm'
import { normalizeApiError } from '../../shared/api/errors'
import { ComplianceSubNav } from './ComplianceSubNav'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function EbmCompliancePage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [config, setConfig] = useState<EbmConfig | null>(null)
  const [report, setReport] = useState<EbmComplianceReport | null>(null)
  const [receipts, setReceipts] = useState<EbmReceipt[]>([])
  const [tin, setTin] = useState('')
  const [serial, setSerial] = useState('')
  const [apiUrl, setApiUrl] = useState('https://ebm.example.rw')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setError(null)
    const [cfg, rpt, rcpt] = await Promise.all([
      getEbmConfig(),
      getEbmReport(period).catch(() => null),
      listEbmReceipts(),
    ])
    setConfig(cfg)
    if (cfg) {
      setTin(cfg.ebmTin)
      setSerial(cfg.ebmDeviceSerial)
      setApiUrl(cfg.ebmApiUrl)
    }
    setReport(rpt)
    setReceipts(rcpt)
  }

  useEffect(() => {
    load().catch((e) => setError(normalizeApiError(e).message))
  }, [period])

  async function onSaveConfig(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await saveEbmConfig({ ebmTin: tin, ebmDeviceSerial: serial, ebmApiUrl: apiUrl, isActive: true })
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  const receiptColumns = useMemo((): DataTableColumn<EbmReceipt>[] => [
    { key: 'status', header: 'Status', columnType: 'status' },
    { key: 'ebmReceiptNumber', header: 'Receipt #' },
    {
      key: 'errorMessage',
      header: 'Error',
      render: value => <span className="text-xs text-red-700">{String(value ?? '')}</span>,
    },
  ], [])

  async function onRetry(receiptId: string) {
    setBusy(true)
    try {
      await retryEbmReceipt(receiptId)
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ComplianceSubNav />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">EBM integration</h1>
            <p className="m-0 text-sm text-neutral-600">RRA electronic billing machine receipts from POS (Sprint 1.4).</p>
          </div>
        </div>
        <EfdStatusBadge />
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <form onSubmit={onSaveConfig} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <label className="text-sm">
          TIN
          <input className="mt-1 w-full rounded border px-2 py-2" value={tin} onChange={(e) => setTin(e.target.value)} required />
        </label>
        <label className="text-sm">
          Device serial
          <input className="mt-1 w-full rounded border px-2 py-2" value={serial} onChange={(e) => setSerial(e.target.value)} required />
        </label>
        <label className="text-sm sm:col-span-2">
          EBM API URL
          <input className="mt-1 w-full rounded border px-2 py-2" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} required />
        </label>
        <button type="submit" disabled={busy} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white sm:col-span-2">
          {config ? 'Update config' : 'Save config'}
        </button>
      </form>

      <label className="block text-sm">
        Report period
        <input className="mt-1 rounded border px-2 py-2 font-mono" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </label>

      {report && (
        <p className="text-sm">
          Confirmed: {report.confirmedSubmissions} · Failed: {report.failedSubmissions} · Pending:{' '}
          {report.pendingSubmissions} · Coverage: {(report.coverageRate * 100).toFixed(0)}%
        </p>
      )}

      <DataTable
        columns={receiptColumns}
        rows={receipts}
        getRowKey={row => row.id}
        isLoading={busy}
        rowActions={[
          {
            label: 'Retry',
            onClick: row => void onRetry(row.id),
            disabled: row => row.status !== 'FAILED' || busy,
          },
        ]}
        emptyStateLabel="No EBM receipts yet"
      />
    </div>
  )
}
