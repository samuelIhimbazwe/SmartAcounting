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

import { Button } from '../../shared/components/ui/Button'

import { ComplianceSubNav } from './ComplianceSubNav'

import {

  FormActions,

  FormField,

  FormSection,

  FormStack,

  Input,

  useFieldValidation,

} from '../../components/ui'



type ApiMode = 'sandbox' | 'production'



export function RraSettingsPage() {

  const [tin, setTin] = useState('')

  const [serial, setSerial] = useState('')

  const [apiMode, setApiMode] = useState<ApiMode>('sandbox')

  const [eisStatus, setEisStatus] = useState<string>('Checking…')

  const [testResult, setTestResult] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)



  const formValues = { serial, tin }

  const { errors, valid, onBlur, validateAll } = useFieldValidation(formValues, {

    serial: value => (String(value ?? '').trim() ? undefined : 'EBM device serial is required.'),

    tin: value => (String(value ?? '').trim() ? undefined : 'Taxpayer TIN is required.'),

  })



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

    if (!validateAll()) {

      return

    }

    setBusy(true)

    setError(null)

    try {

      const ebmApiUrl = apiMode === 'sandbox' ? EBM_SANDBOX_API_URL : EBM_PRODUCTION_API_URL

      await persistEbmConfig({

        ebmTin: tin.trim(),

        ebmDeviceSerial: serial.trim(),

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



      <form onSubmit={onSave} className="rounded-xl border p-4">

        <FormSection title="EBM configuration">

          <FormStack>

            <FormField label="EBM device serial number" required error={errors.serial} valid={valid.serial}>

              <Input

                value={serial}

                onChange={(e) => setSerial(e.target.value)}

                onBlur={() => onBlur('serial')}

                required

              />

            </FormField>

            <FormField label="Taxpayer TIN" required error={errors.tin} valid={valid.tin}>

              <Input value={tin} onChange={(e) => setTin(e.target.value)} onBlur={() => onBlur('tin')} required />

            </FormField>

            <FormField label="EBM API endpoint">

              <div className="flex flex-wrap gap-4 text-sm">

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

            </FormField>

            <FormField label="EIS token status">

              <p className="m-0 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{eisStatus}</p>

            </FormField>

          </FormStack>

        </FormSection>

        <FormActions className="mt-4">

          <Button type="button" variant="ghost" disabled={busy} onClick={() => void onTest()}>

            Test connection

          </Button>

          <Button type="submit" variant="primary" disabled={busy}>

            Save settings

          </Button>

        </FormActions>

      </form>

    </div>

  )

}


