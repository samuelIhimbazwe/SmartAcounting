import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch, type FieldErrors, type Resolver, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router'
import { normalizeApiError } from '../../shared/api/errors'
import { submitTransaction, type TransactionRecord, type TransactionType } from '../../shared/api/forms'
import { formatCurrency } from '../../shared/utils/intl'
import { invoiceSchema, purchaseOrderSchema, salesOrderSchema } from './transactionSchemas'

const transactionMeta: Record<TransactionType, { titleKey: string; subtitleKey: string }> = {
  invoice: {
    titleKey: 'forms.titles.invoice',
    subtitleKey: 'forms.subtitles.invoice',
  },
  'purchase-order': {
    titleKey: 'forms.titles.purchaseOrder',
    subtitleKey: 'forms.subtitles.purchaseOrder',
  },
  'sales-order': {
    titleKey: 'forms.titles.salesOrder',
    subtitleKey: 'forms.subtitles.salesOrder',
  },
}

const resolverByType: Record<TransactionType, Resolver<FormValues>> = {
  invoice: zodResolver(invoiceSchema) as unknown as Resolver<FormValues>,
  'purchase-order': zodResolver(purchaseOrderSchema) as unknown as Resolver<FormValues>,
  'sales-order': zodResolver(salesOrderSchema) as unknown as Resolver<FormValues>,
}

type FormValues = Record<string, string | number | undefined>

function getDefaultValues(type: TransactionType): FormValues {
  const base: FormValues = {
    documentNumber: '',
    partnerName: '',
    amount: 0,
    currency: 'USD',
    dueDate: '',
    notes: '',
  }

  if (type === 'invoice') {
    base.taxRate = 0
  }
  if (type === 'purchase-order') {
    base.costCenter = ''
  }
  if (type === 'sales-order') {
    base.expectedCloseDate = ''
  }

  return base
}

function ErrorText({ errors, field }: { errors: FieldErrors<FormValues>; field: string }) {
  const message = errors[field]?.message
  if (typeof message !== 'string') {
    return null
  }
  return (
    <p id={`${field}-error`} className="m-0 mt-1 text-xs text-rose-700" role="alert">
      {message}
    </p>
  )
}

function BaseFields({ register, errors }: { register: UseFormRegister<FormValues>; errors: FieldErrors<FormValues> }) {
  const { t } = useTranslation()
  return (
    <>
      <label className="block text-sm">
        {t('forms.fields.documentNumber')}
        <input
          className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
          aria-invalid={Boolean(errors.documentNumber)}
          aria-describedby={errors.documentNumber ? 'documentNumber-error' : undefined}
          {...register('documentNumber')}
        />
        <ErrorText errors={errors} field="documentNumber" />
      </label>

      <label className="block text-sm">
        {t('forms.fields.counterparty')}
        <input
          className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
          aria-invalid={Boolean(errors.partnerName)}
          aria-describedby={errors.partnerName ? 'partnerName-error' : undefined}
          {...register('partnerName')}
        />
        <ErrorText errors={errors} field="partnerName" />
      </label>

      <label className="block text-sm">
        {t('forms.fields.amount')}
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? 'amount-error' : undefined}
          {...register('amount', { valueAsNumber: true })}
        />
        <ErrorText errors={errors} field="amount" />
      </label>

      <label className="block text-sm">
        {t('forms.fields.currency')}
        <input
          className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2 uppercase"
          aria-invalid={Boolean(errors.currency)}
          aria-describedby={errors.currency ? 'currency-error' : undefined}
          {...register('currency')}
        />
        <ErrorText errors={errors} field="currency" />
      </label>

      <label className="block text-sm">
        {t('forms.fields.dueDate')}
        <input
          type="date"
          className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
          aria-invalid={Boolean(errors.dueDate)}
          aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
          {...register('dueDate')}
        />
        <ErrorText errors={errors} field="dueDate" />
      </label>
    </>
  )
}

export function TransactionFormsPage({ type }: { type: TransactionType }) {
  const { t } = useTranslation()
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: resolverByType[type],
    defaultValues: getDefaultValues(type),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const watchedAmount = useWatch({ control, name: 'amount' })
  const amount = Number(watchedAmount ?? 0)
  const hasUnsavedChanges = isDirty && !submitting
  const blocker = useBlocker(hasUnsavedChanges)
  const translatedTitle = t(transactionMeta[type].titleKey)
  const translatedSubtitle = t(transactionMeta[type].subtitleKey)

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return
    }
    const shouldLeave = window.confirm(t('forms.confirmLeave'))
    if (shouldLeave) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker, t])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsavedChanges])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setSubmitMessage(null)
    setSubmitError(null)
    try {
      const payload: TransactionRecord = {
        documentNumber: String(values.documentNumber ?? ''),
        partnerName: String(values.partnerName ?? ''),
        amount: Number(values.amount ?? 0),
        currency: String(values.currency ?? ''),
        dueDate: String(values.dueDate ?? ''),
        notes: typeof values.notes === 'string' ? values.notes : undefined,
        taxRate: typeof values.taxRate === 'number' ? values.taxRate : undefined,
        costCenter: typeof values.costCenter === 'string' ? values.costCenter : undefined,
        expectedCloseDate: typeof values.expectedCloseDate === 'string' ? values.expectedCloseDate : undefined,
      }

      await submitTransaction(type, payload)
      setSubmitMessage(t('forms.submittedSuccess', { title: translatedTitle }))
      reset(getDefaultValues(type))
    } catch (caughtError) {
      const apiError = normalizeApiError(caughtError)
      setSubmitError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  function onDiscard() {
    if (hasUnsavedChanges && !window.confirm(t('forms.confirmDiscard'))) {
      return
    }
    reset(getDefaultValues(type))
    setSubmitError(null)
    setSubmitMessage(null)
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      <header>
        <h2 className="m-0 font-[var(--font-display)] text-2xl font-semibold text-neutral-900">{translatedTitle}</h2>
        <p className="m-0 mt-1 text-sm text-neutral-600">{translatedSubtitle}</p>
      </header>

      <form
        className="grid grid-cols-1 gap-4 rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-[var(--shadow-card)] md:grid-cols-2"
        onSubmit={handleSubmit((data) => void onSubmit(data))}
      >
        <BaseFields register={register} errors={errors} />

        {type === 'invoice' && (
          <label className="block text-sm">
            {t('forms.fields.taxRate')}
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
              aria-invalid={Boolean(errors.taxRate)}
              aria-describedby={errors.taxRate ? 'taxRate-error' : undefined}
              {...register('taxRate', { valueAsNumber: true })}
            />
            <ErrorText errors={errors} field="taxRate" />
          </label>
        )}

        {type === 'purchase-order' && (
          <label className="block text-sm">
            {t('forms.fields.costCenter')}
            <input
              className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
              aria-invalid={Boolean(errors.costCenter)}
              aria-describedby={errors.costCenter ? 'costCenter-error' : undefined}
              {...register('costCenter')}
            />
            <ErrorText errors={errors} field="costCenter" />
          </label>
        )}

        {type === 'sales-order' && (
          <label className="block text-sm">
            {t('forms.fields.expectedCloseDate')}
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
              aria-invalid={Boolean(errors.expectedCloseDate)}
              aria-describedby={errors.expectedCloseDate ? 'expectedCloseDate-error' : undefined}
              {...register('expectedCloseDate')}
            />
            <ErrorText errors={errors} field="expectedCloseDate" />
          </label>
        )}

        <label className="block text-sm md:col-span-2">
          {t('forms.fields.notes')}
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? 'notes-error' : undefined}
            {...register('notes')}
          />
          <ErrorText errors={errors} field="notes" />
        </label>

        <div className="flex items-center justify-between md:col-span-2">
          <p className="m-0 text-sm text-neutral-600">
            {t('forms.previewTotal')}: <strong>{formatCurrency(Number.isFinite(amount) ? amount : 0)}</strong>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-[var(--border-default)] px-4 py-2 text-sm text-neutral-700 disabled:opacity-60"
              onClick={onDiscard}
              disabled={submitting}
            >
              {t('forms.discardChanges')}
            </button>
            <button
              type="submit"
              className="rounded-md bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? t('forms.submitting') : t('forms.submitEntry')}
            </button>
          </div>
        </div>
      </form>

      {hasUnsavedChanges && <p className="m-0 text-xs text-amber-700">{t('forms.unsavedChanges')}</p>}
      {submitMessage && <p className="m-0 text-sm text-emerald-700" role="status">{submitMessage}</p>}
      {submitError && <p className="m-0 text-sm text-rose-700" role="alert">{submitError}</p>}
    </section>
  )
}
