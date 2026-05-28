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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listPriceLists().then(setPriceLists)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    const normalizedPhone = phone.trim() ? normalizePhone(phone.trim()) : undefined
    if (normalizedPhone && !RW_PHONE.test(normalizedPhone.replace(/\s/g, ''))) {
      setError('Enter a valid Rwanda mobile number (+250 7XX XXX XXX).')
      return
    }
    const payload: CustomerUpsertPayload = {
      name: trimmedName,
      phone: normalizedPhone,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      customerType: 'RETAIL',
      loyaltyEnabled: true,
    }
    const limit = creditLimit.trim() ? Number(creditLimit) : undefined
    if (limit != null && Number.isFinite(limit) && limit >= 0) {
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
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={e => void handleSubmit(e)}>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}
      <label className="block text-sm">
        <span className="font-medium text-neutral-800">Name *</span>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-neutral-800">Phone (+250)</span>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="+250788123456"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-neutral-800">Email</span>
        <input
          type="email"
          className="mt-1 w-full rounded border px-3 py-2"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-neutral-800">Credit limit (RWF)</span>
        <input
          type="number"
          min={0}
          className="mt-1 w-full rounded border px-3 py-2"
          value={creditLimit}
          onChange={e => setCreditLimit(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-neutral-800">Assigned price list</span>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={priceListId}
          onChange={e => setPriceListId(e.target.value)}
        >
          <option value="">Default pricing</option>
          {priceLists.map(pl => (
            <option key={pl.id} value={pl.id}>
              {pl.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-neutral-800">Notes</span>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : mode === 'create' ? 'Create customer' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
