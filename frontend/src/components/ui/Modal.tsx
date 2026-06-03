import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'
import { cn } from './utils'

export type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: ModalSize
  footer?: ReactNode
  children?: ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  footer,
  children,
}: ModalProps) {
  const containerRef = useModalFocusTrap({ active: open, onEscape: onClose })

  useEffect(() => {
    if (!open) {
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="ui-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={containerRef}
        className={cn('ui-modal', `ui-modal--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="ui-modal__header">
          <h2 id="ui-modal-title" className="ui-modal__title">
            {title}
          </h2>
          {subtitle ? <p className="ui-modal__subtitle">{subtitle}</p> : null}
        </header>
        {children ? <div className="ui-modal__body">{children}</div> : null}
        {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}
