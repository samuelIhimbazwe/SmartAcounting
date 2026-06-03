import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from './utils'

export interface TableRowAction {
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}

export interface TableRowActionsMenuProps {
  actions: TableRowAction[]
  ariaLabel?: string
}

export function TableRowActionsMenu({ actions, ariaLabel = 'Row actions' }: TableRowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (actions.length === 0) {
    return null
  }

  return (
    <div className="ui-table-actions" ref={rootRef}>
      <button
        type="button"
        className="ui-table-actions__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={event => {
          event.stopPropagation()
          setOpen(v => !v)
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div className="ui-table-actions__menu" role="menu">
          {actions.map(action => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={cn(
                'ui-table-actions__item',
                action.destructive && 'ui-table-actions__item--danger',
              )}
              disabled={action.disabled}
              onClick={event => {
                event.stopPropagation()
                setOpen(false)
                action.onClick()
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function TablePrimaryLink({
  label,
  href,
  onClick,
}: {
  label: string
  href?: string
  onClick?: () => void
}) {
  if (href) {
    return (
      <a className="ui-table-link" href={href} onClick={onClick}>
        {label} →
      </a>
    )
  }
  return (
    <button type="button" className="ui-table-link" onClick={onClick}>
      {label} →
    </button>
  )
}
