import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatRwf, formatRwfInput, parseRwfInput } from '../../utils/currency'
import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'
import type { TillSessionDto } from '../../shared/api/tillSessions'

export function CloseTillModal({
  open,
  session,
  expectedCash,
  onClose,
  onConfirm,
}: {
  open: boolean
  session: TillSessionDto
  expectedCash: number
  onClose: () => void
  onConfirm: (closingCash: number, notes?: string) => Promise<void>
}) {
  const [actualInput, setActualInput] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useModalFocusTrap({ active: open, onEscape: onClose })

  const actualCash = parseRwfInput(actualInput)
  const variance = useMemo(() => actualCash - expectedCash, [actualCash, expectedCash])

  useEffect(() => {
    if (open) {
      setActualInput(formatRwfInput(String(Math.round(expectedCash))))
      setNotes('')
      setError(null)
    }
  }, [open, expectedCash])

  if (!open) {
    return null
  }

  const handleClose = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(actualCash, notes.trim() || undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close till')
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
      aria-labelledby="close-till-title"
    >
      <div className="modal-panel modal-panel--md">
        <h2 id="close-till-title" className="m-0 text-lg font-semibold">
          Close till
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Register {session.posRegisterCode} · opened {new Date(session.openedAt).toLocaleString()}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-600">Opening float</dt>
            <dd className="font-medium tabular-nums">{formatRwf(session.openingFloat)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-600">Expected cash in drawer</dt>
            <dd className="font-medium tabular-nums">{formatRwf(expectedCash)}</dd>
          </div>
        </dl>

        <label className="mt-4 block text-sm">
          Actual cash counted
          <input
            type="text"
            inputMode="numeric"
            className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2 tabular-nums"
            value={actualInput}
            onChange={(e) => setActualInput(formatRwfInput(e.target.value))}
          />
        </label>

        <p className="mt-2 text-sm">
          Variance:{' '}
          <span className={variance === 0 ? 'font-medium text-emerald-700' : 'font-medium text-amber-800'}>
            {formatRwf(variance)}
          </span>
        </p>

        <label className="mt-3 block text-sm">
          Closing notes
          <textarea
            className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error ? (
          <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-sm text-red-800">{error}</p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-md border px-4 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-md bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={busy}
            onClick={() => void handleClose()}
          >
            {busy ? 'Closing…' : 'Close till'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
