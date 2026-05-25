import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'
import { Button } from '../../shared/components/ui/Button'
import type { QueueStatusItem } from '../../utils/platform'

interface FailedSalesModalProps {
  open: boolean
  items: QueueStatusItem[]
  onClose: () => void
  onRetryAll: () => Promise<void>
  onDismissAll: () => Promise<void>
}

export function FailedSalesModal({
  open,
  items,
  onClose,
  onRetryAll,
  onDismissAll,
}: FailedSalesModalProps) {
  const containerRef = useModalFocusTrap({ active: open, onEscape: onClose })
  const [busy, setBusy] = useState(false)

  if (!open) {
    return null
  }

  const failedOnly = items.filter((item) => item.retryCount >= 3)

  const handleRetryAll = async () => {
    setBusy(true)
    try {
      await onRetryAll()
    } finally {
      setBusy(false)
    }
  }

  const handleDismissAll = async () => {
    const ok = window.confirm(
      'Remove all failed sales from the local queue? They will not sync automatically.',
    )
    if (!ok) {
      return
    }
    setBusy(true)
    try {
      await onDismissAll()
      onClose()
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
      aria-labelledby="failed-sales-title"
    >
      <div className="modal-panel modal-panel--md">
        <div className="flex items-start justify-between gap-2">
          <h2 id="failed-sales-title" className="m-0 text-lg font-semibold">
            Failed offline sales
          </h2>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          These sales could not sync after 3 attempts. Retry or dismiss them from the local queue.
        </p>
        <ul className="m-0 mt-4 max-h-64 list-none space-y-2 overflow-y-auto p-0">
          {failedOnly.length === 0 ? (
            <li className="text-sm text-neutral-500">No failed sales in the queue.</li>
          ) : (
            failedOnly.map((item) => (
              <li key={item.localId} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                <p className="m-0 font-mono font-medium">{item.localId.slice(0, 8).toUpperCase()}…</p>
                <p className="m-0 mt-1 text-xs text-neutral-600">
                  {new Date(item.createdAt).toLocaleString()} · {item.retryCount} attempts
                </p>
                {item.lastError ? (
                  <p className="m-0 mt-1 text-xs text-red-800">{item.lastError}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="primary" disabled={busy || !failedOnly.length} onClick={() => void handleRetryAll()}>
            Retry all
          </Button>
          <Button type="button" variant="ghost" disabled={busy || !failedOnly.length} onClick={() => void handleDismissAll()}>
            Dismiss all
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
