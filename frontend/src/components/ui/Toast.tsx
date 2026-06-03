import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useToastStore } from './toastStore'

export function ToastViewport() {
  const items = useToastStore((s) => s.items)
  const dismiss = useToastStore((s) => s.dismiss)

  if (items.length === 0) {
    return null
  }

  return createPortal(
    <div className="ui-toast-viewport" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div key={item.id} className={`ui-toast ui-toast--${item.variant}`} role="status">
          <span className="ui-toast__message">{item.message}</span>
          <button
            type="button"
            className="ui-toast__close"
            aria-label="Dismiss notification"
            onClick={() => dismiss(item.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
