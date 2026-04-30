import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useModalFocusTrap } from '../../../shared/hooks/useModalFocusTrap'
import { useAlertStore } from '../../../shared/stores/alertStore'

interface AlertFeedProps {
  open: boolean
  onClose: () => void
}

export function AlertFeed({ open, onClose }: AlertFeedProps) {
  const { t } = useTranslation()
  const alerts = useAlertStore((state) => state.alerts)
  const panelRef = useModalFocusTrap({
    active: open,
    onEscape: onClose,
  })

  if (!open) {
    return null
  }

  const severityClass: Record<string, string> = {
    LOW: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]',
    MEDIUM: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
    HIGH: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
    CRITICAL: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]',
  }

  return (
    <aside
      ref={panelRef}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-[var(--border-subtle)] bg-white p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-title"
      tabIndex={-1}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 id="alerts-title" className="m-0 font-[var(--font-display)] text-xl font-semibold text-neutral-900">
          {t('alerts.title')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-[var(--border-default)] p-2 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-label={t('alerts.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2 overflow-auto pr-1">
        {alerts.length === 0 && <p className="text-sm text-neutral-500">{t('alerts.empty')}</p>}
        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold text-neutral-900">{alert.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  severityClass[alert.severity] ?? 'bg-[var(--surface-overlay)] text-neutral-700'
                }`}
              >
                {alert.severity}
              </span>
            </div>
            <p className="m-0 text-xs leading-5 text-neutral-600">{alert.message}</p>
            <p className="m-0 mt-2 text-[11px] text-neutral-400">{alert.timestamp}</p>
          </article>
        ))}
      </div>
    </aside>
  )
}
