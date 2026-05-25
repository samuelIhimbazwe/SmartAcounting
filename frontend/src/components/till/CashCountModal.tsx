import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatRwf, parseRwfInput } from '../../utils/currency'
import { computeCashCountTotal, TILL_COINS, TILL_NOTES } from '../../utils/cashCount'
import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'
import type { CashCountResult } from '../../shared/api/tillSessions'

type Denom = (typeof TILL_COINS)[number] | (typeof TILL_NOTES)[number]

export function CashCountModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    denominations: Record<string, number>
    total: number
    notes?: string
  }) => Promise<CashCountResult>
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<CashCountResult | null>(null)
  const containerRef = useModalFocusTrap({ active: open, onEscape: onClose })

  const total = useMemo(() => computeCashCountTotal(quantities), [quantities])

  if (!open) {
    return null
  }

  const setQty = (key: string, value: string) => {
    setQuantities((prev) => ({ ...prev, [key]: value.replace(/[^\d]/g, '') }))
  }

  const handleSubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      const denominations: Record<string, number> = {}
      for (const coin of TILL_COINS) {
        const qty = parseRwfInput(quantities[`c${coin}`] ?? '0')
        if (qty > 0) {
          denominations[`${coin}`] = qty
        }
      }
      for (const note of TILL_NOTES) {
        const qty = parseRwfInput(quantities[`n${note}`] ?? '0')
        if (qty > 0) {
          denominations[`${note}`] = qty
        }
      }
      const result = await onSubmit({
        denominations,
        total,
        notes: notes.trim() || undefined,
      })
      setConfirmation(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cash count failed')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      ref={containerRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cash-count-title"
    >
      <div className="modal-panel modal-panel--lg">
        <div className="flex items-start justify-between gap-2">
          <h2 id="cash-count-title" className="m-0 text-lg font-semibold text-neutral-900">
            Record cash count
          </h2>
          <button type="button" className="rounded border px-2 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {confirmation ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="m-0 font-medium text-emerald-800">Cash count saved.</p>
            <p className="m-0">Counted: {formatRwf(confirmation.total)}</p>
            <p className="m-0">Expected cash in drawer: {formatRwf(confirmation.expectedCash)}</p>
            <p className="m-0">
              Variance:{' '}
              <span className={confirmation.variance === 0 ? 'text-emerald-700' : 'text-amber-800'}>
                {formatRwf(confirmation.variance)}
              </span>
            </p>
            <button
              type="button"
              className="mt-3 rounded-md bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-600">Enter quantity per denomination (RWF).</p>
            {error ? (
              <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-500">
                  <th className="pb-2">Denomination</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="pt-2 text-xs font-semibold text-neutral-500">
                    Coins
                  </td>
                </tr>
                {TILL_COINS.map((denom) => (
                  <DenomRow
                    key={denom}
                    label={`${denom} RWF`}
                    qtyKey={`c${denom}`}
                    denom={denom}
                    quantities={quantities}
                    onQty={setQty}
                  />
                ))}
                <tr>
                  <td colSpan={3} className="pt-3 text-xs font-semibold text-neutral-500">
                    Notes
                  </td>
                </tr>
                {TILL_NOTES.map((denom) => (
                  <DenomRow
                    key={denom}
                    label={`${denom} RWF`}
                    qtyKey={`n${denom}`}
                    denom={denom}
                    quantities={quantities}
                    onQty={setQty}
                  />
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right text-base font-semibold">Total: {formatRwf(total)}</p>
            <label className="mt-3 block text-sm">
              Notes
              <textarea
                className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="mt-4 w-full rounded-md bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={busy || total <= 0}
              onClick={() => void handleSubmit()}
            >
              {busy ? 'Submitting…' : 'Submit count'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function DenomRow({
  label,
  qtyKey,
  denom,
  quantities,
  onQty,
}: {
  label: string
  qtyKey: string
  denom: Denom
  quantities: Record<string, string>
  onQty: (key: string, value: string) => void
}) {
  const qty = parseRwfInput(quantities[qtyKey] ?? '0')
  return (
    <tr className="border-t border-[var(--border-subtle)]">
      <td className="py-2">{label}</td>
      <td className="py-2">
        <input
          type="text"
          inputMode="numeric"
          className="w-20 rounded border px-2 py-1"
          value={quantities[qtyKey] ?? ''}
          onChange={(e) => onQty(qtyKey, e.target.value)}
        />
      </td>
      <td className="py-2 text-right tabular-nums">{formatRwf(denom * qty)}</td>
    </tr>
  )
}
