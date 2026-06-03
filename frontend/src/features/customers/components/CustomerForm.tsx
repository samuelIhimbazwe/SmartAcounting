import { useEffect, useState, type FormEvent } from 'react'
import {
  createCustomer,
  updateCustomer,
  listPriceLists,
  type CustomerSummary,
  type CustomerUpsertPayload,
  type PriceListOption,
} from '../../../shared/api/customers'
import { normalizeApiError } from '../../../shared/api/errors'
import { Button } from '../../../shared/components/ui/Button'
import {
  FormActions,
  FormField,
  FormSection,
  FormStack,
  Input,
  Select,
  useFieldValidation,
} from '../../../components/ui'

export interface CustomerFormProps {
  mode: 'create' | 'edit'
  initial?: CustomerSummary | null
  onSaved: (customer: CustomerSummary) => void
  onCancel: () => void
}

const RW_PHONE = /^(\+250|250|0)?7\d{8}$/

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('250')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+250${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith('7')) return `+250${digits}`
  return raw.trim()
}

export function CustomerForm({ mode, initial, onSaved, onCancel }: CustomerFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [creditLimit, setCreditLimit] = useState(
    initial?.creditLimit != null ? String(initial.creditLimit) : '',
  )
  const [priceListId, setPriceListId] = useState(initial?.priceListId ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [priceLists, setPriceLists] = useState<PriceListOption[]>([])
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const values = { name, phone, email, creditLimit, priceListId, notes }
  const { errors, valid, onBlur, validateAll } = useFieldValidation(values, {
    name: value => {
      const trimmed = String(value ?? '').trim()
      if (!trimmed) return 'Name is required.'
      if (trimmed.length > 200) return 'Name must be 200 characters or fewer.'
      return undefined
    },
    phone: value => {
      const raw = String(value ?? '').trim()
      if (!raw) return undefined
      const normalized = normalizePhone(raw)
      if (!RW_PHONE.test(normalized.replace(/\s/g, ''))) {
        return 'Enter a valid Rwanda mobile number (+250 7XX XXX XXX).'
      }
      return undefined
    },
    email: value => {
      const raw = String(value ?? '').trim()
      if (!raw) return undefined
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return 'Enter a valid email address.'
      return undefined
    },
    creditLimit: value => {
      const raw = String(value ?? '').trim()
      if (!raw) return undefined
      const limit = Number(raw)
      if (!Number.isFinite(limit) || limit < 0) return 'Credit limit must be zero or a positive number.'
      return undefined
    },
  })

  useEffect(() => {
    void listPriceLists().then(setPriceLists)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!validateAll()) {
      return
    }
    const trimmedName = name.trim()
    const normalizedPhone = phone.trim() ? normalizePhone(phone.trim()) : undefined
    const payload: CustomerUpsertPayload = {
      name: trimmedName,
      phone: normalizedPhone,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      customerType: 'RETAIL',
      loyaltyEnabled: true,
    }
    const limit = creditLimit.trim() ? Number(creditLimit) : undefined
    if (limit != null) {
      payload.creditLimit = limit
    }
    if (priceListId) {
      payload.priceListId = priceListId
    }
    setBusy(true)
    try {
      const saved =
        mode === 'create'
          ? await createCustomer(payload)
          : await updateCustomer(initial!.id, payload)
      onSaved(saved)
    } catch (err) {
      setSubmitError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ui-form-layout" onSubmit={e => void handleSubmit(e)}>
      {submitError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{submitError}</p>
      ) : null}

      <FormSection title="Basic details">
        <FormStack>
          <FormField label="Name" required error={errors.name} helper="As it appears on receipts" valid={valid.name}>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => onBlur('name')}
              required
            />
          </FormField>
          <FormField label="Phone (+250)" error={errors.phone} valid={valid.phone}>
            <Input
              placeholder="+250788123456"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onBlur={() => onBlur('phone')}
            />
          </FormField>
          <FormField label="Email" error={errors.email} valid={valid.email}>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => onBlur('email')}
            />
          </FormField>
        </FormStack>
      </FormSection>

      <FormSection title="Pricing & credit">
        <FormStack>
          <FormField label="Credit limit (RWF)" error={errors.creditLimit} valid={valid.creditLimit}>
            <Input
              type="number"
              min={0}
              value={creditLimit}
              onChange={e => setCreditLimit(e.target.value)}
              onBlur={() => onBlur('creditLimit')}
            />
          </FormField>
          <FormField label="Assigned price list">
            <Select
              options={[
                { value: '', label: 'Default pricing' },
                ...priceLists.map(pl => ({ value: pl.id, label: pl.name })),
              ]}
              value={priceListId || null}
              onChange={value => setPriceListId(value ?? '')}
              clearable={false}
            />
          </FormField>
        </FormStack>
      </FormSection>

      <FormSection title="Optional" collapsible defaultCollapsed>
        <FormField label="Notes">
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </FormField>
      </FormSection>

      <FormActions sticky>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : mode === 'create' ? 'Create customer' : 'Save changes'}
        </Button>
      </FormActions>
    </form>
  )
}
