import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './utils'
import { Badge, type BadgeVariant } from './Badge'
import { TableRowActionsMenu, type TableRowAction } from './TableRowActionsMenu'

export interface ListCardProps {
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  primary: ReactNode
  secondary?: ReactNode
  metric?: ReactNode
  badge?: { label: string; variant?: BadgeVariant }
  menuActions?: TableRowAction[]
  onClick?: () => void
  href?: string
  className?: string
}

export function ListCard({
  icon: Icon,
  iconColor = 'var(--color-primary)',
  iconBg = 'var(--color-primary-light)',
  primary,
  secondary,
  metric,
  badge,
  menuActions,
  onClick,
  href,
  className,
}: ListCardProps) {
  const interactive = Boolean(onClick || href)
  const content = (
    <>
      {Icon ? (
        <span className="ui-list-card__icon" style={{ color: iconColor, background: iconBg }}>
          <Icon size={18} />
        </span>
      ) : null}
      <span className="ui-list-card__body">
        <span className="ui-list-card__primary">{primary}</span>
        {secondary ? <span className="ui-list-card__secondary">{secondary}</span> : null}
      </span>
      <span className="ui-list-card__aside">
        {metric ? <span className="ui-list-card__metric">{metric}</span> : null}
        {badge ? <Badge variant={badge.variant ?? 'neutral'} size="sm">{badge.label}</Badge> : null}
        {menuActions && menuActions.length > 0 ? (
          <TableRowActionsMenu actions={menuActions} ariaLabel="Customer actions" />
        ) : null}
      </span>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        className={cn('ui-list-card', interactive && 'ui-list-card--interactive', className)}
        onClick={onClick}
      >
        {content}
      </a>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={cn('ui-list-card', 'ui-list-card--interactive', className)}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return <div className={cn('ui-list-card', className)}>{content}</div>
}

export function ListCardStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('ui-list-card-stack', className)}>{children}</div>
}
