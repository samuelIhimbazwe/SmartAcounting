import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote } from 'lucide-react'
import { currencyUpsertRate } from '../../shared/api/currency'
import { normalizeApiError } from '../../shared/api/errors'
import { Button } from '../../shared/components/ui/Button'
import {
  FormActions,
  FormField,
  FormStack,
  Input,
  useFieldValidation,
} from '../../components/ui'

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

  const formValues = { baseCurrency, quoteCurrency, rate, asOfDate }
  const { errors, valid, onBlur, validateAll } = useFieldValidation(formValues, {
    baseCurrency: value => (String(value ?? '').trim() ? undefined : 'Base currency is required.'),
    quoteCurrency: value => (String(value ?? '').trim() ? undefined : 'Quote currency is required.'),
    rate: value => (String(value ?? '').trim() ? undefined : 'Rate is required.'),
    asOfDate: value => (String(value ?? '').trim() ? undefined : 'As-of date is required.'),
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validateAll()) {
      return
    }
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
        <FormStack>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t('fxRates.base')} required error={errors.baseCurrency} valid={valid.baseCurrency}>
              <Input
                className="uppercase"
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                onBlur={() => onBlur('baseCurrency')}
                required
                maxLength={8}
                spellCheck={false}
              />
            </FormField>
            <FormField label={t('fxRates.quote')} required error={errors.quoteCurrency} valid={valid.quoteCurrency}>
              <Input
                className="uppercase"
                value={quoteCurrency}
                onChange={(e) => setQuoteCurrency(e.target.value)}
                onBlur={() => onBlur('quoteCurrency')}
                required
                maxLength={8}
                spellCheck={false}
              />
            </FormField>
          </div>
          <FormField label={t('fxRates.rate')} required error={errors.rate} valid={valid.rate}>
            <Input
              className="font-mono"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              onBlur={() => onBlur('rate')}
              placeholder={t('fxRates.ratePlaceholder')}
              inputMode="decimal"
              required
            />
          </FormField>
          <FormField label={t('fxRates.source')}>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="manual"
            />
          </FormField>
          <FormField label={t('fxRates.asOf')} required error={errors.asOfDate} valid={valid.asOfDate}>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              onBlur={() => onBlur('asOfDate')}
              required
            />
          </FormField>
        </FormStack>

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

        <FormActions>
          <Button type="submit" variant="primary" disabled={busy} className="w-full sm:w-auto">
            {busy ? t('fxRates.saving') : t('fxRates.submit')}
          </Button>
        </FormActions>
      </form>
    </div>
  )
}
