import type { ReactNode } from 'react'
import { cn } from './utils'

export type CardPadding = 'sm' | 'md' | 'lg'

export interface CardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  padding?: CardPadding
  hover?: boolean
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Card({
  title,
  subtitle,
  action,
  padding = 'md',
  hover = false,
  children,
  footer,
  className,
}: CardProps) {
  const hasHeader = title || subtitle || action

  return (
    <article className={cn('ui-card', `ui-card--pad-${padding}`, hover && 'ui-card--hover', className)}>
      {hasHeader ? (
        <>
          <header className="ui-card__section ui-card__header">
            <div>
              {title ? <h2 className="ui-card__title">{title}</h2> : null}
              {subtitle ? <p className="ui-card__subtitle">{subtitle}</p> : null}
            </div>
            {action}
          </header>
          {children || footer ? <hr className="ui-card__divider" /> : null}
        </>
      ) : null}
      {children ? <div className="ui-card__section">{children}</div> : null}
      {footer ? (
        <>
          <hr className="ui-card__divider" />
          <footer className="ui-card__section">{footer}</footer>
        </>
      ) : null}
    </article>
  )
}
