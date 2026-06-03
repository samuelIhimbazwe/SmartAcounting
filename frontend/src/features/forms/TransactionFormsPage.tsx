import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch, type FieldErrors, type Resolver, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router'
import { normalizeApiError } from '../../shared/api/errors'
import { submitTransaction, type TransactionRecord, type TransactionType } from '../../shared/api/forms'
import { formatCurrency } from '../../shared/utils/intl'
import { invoiceSchema, purchaseOrderSchema, salesOrderSchema } from './transactionSchemas'
import { Button } from '../../shared/components/ui/Button'
import { FormActions, FormField, FormSection, Input } from '../../components/ui'

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

function BaseFields({ register, errors }: { register: UseFormRegister<FormValues>; errors: FieldErrors<FormValues> }) {
  const { t } = useTranslation()
  const fieldError = (field: string) => {
    const message = errors[field]?.message
    return typeof message === 'string' ? message : undefined
  }
  return (
    <>
      <FormField label={t('forms.fields.documentNumber')} error={fieldError('documentNumber')}>
        <Input {...register('documentNumber')} />
      </FormField>

      <FormField label={t('forms.fields.counterparty')} error={fieldError('partnerName')}>
        <Input {...register('partnerName')} />
      </FormField>

      <FormField label={t('forms.fields.amount')} error={fieldError('amount')}>
        <Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
      </FormField>

      <FormField label={t('forms.fields.currency')} error={fieldError('currency')}>
        <Input className="uppercase" {...register('currency')} />
      </FormField>

      <FormField label={t('forms.fields.dueDate')} error={fieldError('dueDate')}>
        <Input type="date" {...register('dueDate')} />
      </FormField>
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
        className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-[var(--shadow-card)]"
        onSubmit={handleSubmit((data) => void onSubmit(data))}
      >
        <FormSection title={translatedTitle}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BaseFields register={register} errors={errors} />

            {type === 'invoice' && (
              <FormField
                label={t('forms.fields.taxRate')}
                error={typeof errors.taxRate?.message === 'string' ? errors.taxRate.message : undefined}
              >
                <Input type="number" step="0.1" {...register('taxRate', { valueAsNumber: true })} />
              </FormField>
            )}

            {type === 'purchase-order' && (
              <FormField
                label={t('forms.fields.costCenter')}
                error={typeof errors.costCenter?.message === 'string' ? errors.costCenter.message : undefined}
              >
                <Input {...register('costCenter')} />
              </FormField>
            )}

            {type === 'sales-order' && (
              <FormField
                label={t('forms.fields.expectedCloseDate')}
                error={
                  typeof errors.expectedCloseDate?.message === 'string' ? errors.expectedCloseDate.message : undefined
                }
              >
                <Input type="date" {...register('expectedCloseDate')} />
              </FormField>
            )}

            <FormField
              label={t('forms.fields.notes')}
              className="md:col-span-2"
              error={typeof errors.notes?.message === 'string' ? errors.notes.message : undefined}
            >
              <textarea
                rows={3}
                className="w-full rounded-md border border-[var(--border-default)] px-3 py-2"
                {...register('notes')}
              />
            </FormField>
          </div>
        </FormSection>

        <p className="mt-4 text-sm text-neutral-600">
          {t('forms.previewTotal')}: <strong>{formatCurrency(Number.isFinite(amount) ? amount : 0)}</strong>
        </p>

        <FormActions className="mt-4">
          <Button type="button" variant="ghost" onClick={onDiscard} disabled={submitting}>
            {t('forms.discardChanges')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting} aria-busy={submitting}>
            {submitting ? t('forms.submitting') : t('forms.submitEntry')}
          </Button>
        </FormActions>
      </form>

      {hasUnsavedChanges && <p className="m-0 text-xs text-amber-700">{t('forms.unsavedChanges')}</p>}
      {submitMessage && <p className="m-0 text-sm text-emerald-700" role="status">{submitMessage}</p>}
      {submitError && <p className="m-0 text-sm text-rose-700" role="alert">{submitError}</p>}
    </section>
  )
}
