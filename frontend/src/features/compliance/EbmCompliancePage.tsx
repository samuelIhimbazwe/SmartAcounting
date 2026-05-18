import { type FormEvent, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
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
      <header className="flex items-center gap-2">
        <ShieldCheck className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">EBM integration</h1>
          <p className="m-0 text-sm text-neutral-600">RRA electronic billing machine receipts from POS (Sprint 1.4).</p>
        </div>
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

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Receipt #</th>
              <th className="px-3 py-2">Error</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.ebmReceiptNumber ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-red-700">{r.errorMessage ?? ''}</td>
                <td className="px-3 py-2">
                  {r.status === 'FAILED' && (
                    <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => void onRetry(r.id)}>
                      Retry
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
