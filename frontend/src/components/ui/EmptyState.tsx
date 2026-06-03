import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from './utils'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('ui-empty', className)}>
      <div className="ui-empty__icon" aria-hidden>
        {icon ?? <Inbox size={40} strokeWidth={1.25} />}
      </div>
      <h3 className="ui-empty__title">{title}</h3>
      {description ? <p className="ui-empty__desc">{description}</p> : null}
      {action}
    </div>
  )
}
