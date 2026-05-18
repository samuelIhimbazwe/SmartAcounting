import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote } from 'lucide-react'
import { currencyUpsertRate } from '../../shared/api/currency'
import { normalizeApiError } from '../../shared/api/errors'

export function FxRatesPage() {
  const { t } = useTranslation()
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [quoteCurrency, setQuoteCurrency] = useState('RWF')
  const [rate, setRate] = useState('')
  const [source, setSource] = useState('manual')
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLastId(null)
    setBusy(true)
    try {
      const r = await currencyUpsertRate({
        baseCurrency: baseCurrency.trim().toUpperCase(),
        quoteCurrency: quoteCurrency.trim().toUpperCase(),
        rate: rate.trim(),
        source: source.trim() || 'manual',
        asOfDate,
      })
      setLastId(r.rateId)
      setRate('')
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="flex items-center gap-2">
        <Banknote className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">{t('fxRates.title')}</h1>
          <p className="m-0 text-sm text-neutral-600">{t('fxRates.subtitle')}</p>
        </div>
      </header>

      <p className="m-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-3 text-sm text-neutral-700">
        {t('fxRates.hintConvention')}
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-neutral-600">{t('fxRates.base')}</span>
            <input
              className="mt-1 w-full rounded border border-[var(--border-subtle)] px-2 py-2 uppercase"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              required
              maxLength={8}
              spellCheck={false}
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">{t('fxRates.quote')}</span>
            <input
              className="mt-1 w-full rounded border border-[var(--border-subtle)] px-2 py-2 uppercase"
              value={quoteCurrency}
              onChange={(e) => setQuoteCurrency(e.target.value)}
              required
              maxLength={8}
              spellCheck={false}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-neutral-600">{t('fxRates.rate')}</span>
          <input
            className="mt-1 w-full rounded border border-[var(--border-subtle)] px-2 py-2 font-mono"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={t('fxRates.ratePlaceholder')}
            inputMode="decimal"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600">{t('fxRates.source')}</span>
          <input
            className="mt-1 w-full rounded border border-[var(--border-subtle)] px-2 py-2"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="manual"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600">{t('fxRates.asOf')}</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-[var(--border-subtle)] px-2 py-2"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            required
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}
        {lastId && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            {t('fxRates.saved', { id: lastId })}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[var(--color-brand-700)] py-2 font-medium text-white hover:bg-[var(--color-brand-800)] disabled:opacity-50"
        >
          {busy ? t('fxRates.saving') : t('fxRates.submit')}
        </button>
      </form>
    </div>
  )
}
