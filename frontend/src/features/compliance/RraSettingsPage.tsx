import { type FormEvent, useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import {
  EBM_PRODUCTION_API_URL,
  EBM_SANDBOX_API_URL,
  fetchEbmConfig,
  fetchRwandaComplianceHints,
  isSandboxEbmUrl,
  persistEbmConfig,
  testEbmConnection,
} from '../../shared/api/compliance'
import { normalizeApiError } from '../../shared/api/errors'
import { ComplianceSubNav } from './ComplianceSubNav'

type ApiMode = 'sandbox' | 'production'

export function RraSettingsPage() {
  const [tin, setTin] = useState('')
  const [serial, setSerial] = useState('')
  const [apiMode, setApiMode] = useState<ApiMode>('sandbox')
  const [eisStatus, setEisStatus] = useState<string>('Checking…')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setError(null)
    const [cfg, hints] = await Promise.all([
      fetchEbmConfig(),
      fetchRwandaComplianceHints().catch(() => null),
    ])
    if (cfg) {
      setTin(cfg.ebmTin)
      setSerial(cfg.ebmDeviceSerial)
      setApiMode(isSandboxEbmUrl(cfg.ebmApiUrl) ? 'sandbox' : 'production')
    }
    if (hints?.eisIntegrationToggle) {
      setEisStatus('EIS integration enabled (server token via RRA_EIS_API_TOKEN)')
    } else {
      setEisStatus('EIS integration disabled — configure RRA_EIS_API_TOKEN on the server')
    }
  }

  useEffect(() => {
    load().catch((e) => setError(normalizeApiError(e).message))
  }, [])

  async function onTest() {
    setBusy(true)
    setTestResult(null)
    try {
      const result = await testEbmConnection()
      setTestResult(
        result.configured
          ? `Connected (${result.mode})${result.tin ? ` · TIN ${result.tin}` : ''}`
          : result.message ?? 'EBM not configured — mobile uses mock signing',
      )
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const ebmApiUrl = apiMode === 'sandbox' ? EBM_SANDBOX_API_URL : EBM_PRODUCTION_API_URL
      await persistEbmConfig({
        ebmTin: tin,
        ebmDeviceSerial: serial,
        ebmApiUrl,
        isActive: true,
      })
      await load()
      setTestResult('Settings saved.')
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ComplianceSubNav />
      <header className="flex items-center gap-2">
        <Settings className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">RRA settings</h1>
          <p className="m-0 text-sm text-neutral-600">EBM device, taxpayer TIN, and EIS gateway configuration.</p>
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {testResult && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{testResult}</p>
      )}

      <form onSubmit={onSave} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          EBM device serial number
          <input
            className="mt-1 w-full rounded border px-2 py-2"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            required
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Taxpayer TIN
          <input
            className="mt-1 w-full rounded border px-2 py-2"
            value={tin}
            onChange={(e) => setTin(e.target.value)}
            required
          />
        </label>
        <fieldset className="text-sm sm:col-span-2">
          <legend className="mb-2 font-medium">EBM API endpoint</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="apiMode"
                checked={apiMode === 'sandbox'}
                onChange={() => setApiMode('sandbox')}
              />
              Sandbox
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="apiMode"
                checked={apiMode === 'production'}
                onChange={() => setApiMode('production')}
              />
              Production
            </label>
          </div>
          <p className="mt-2 font-mono text-xs text-neutral-500">
            {apiMode === 'sandbox' ? EBM_SANDBOX_API_URL : EBM_PRODUCTION_API_URL}
          </p>
        </fieldset>
        <div className="text-sm sm:col-span-2">
          <span className="font-medium">EIS token status</span>
          <p className="mt-1 rounded-lg bg-neutral-50 px-3 py-2 text-neutral-700">{eisStatus}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onTest()}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
          >
            Test connection
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white"
          >
            Save settings
          </button>
        </div>
      </form>
    </div>
  )
}
