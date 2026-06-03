import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from './utils'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumb?: BreadcrumbItem[]
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('ui-page-header', className)}>
      <div>
        {breadcrumb && breadcrumb.length > 0 ? (
          <ol className="ui-page-header__breadcrumb">
            {breadcrumb.map((item, index) => (
              <li key={`${item.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {index > 0 ? <span aria-hidden>/</span> : null}
                {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
              </li>
            ))}
          </ol>
        ) : null}
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle ? <p className="ui-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  )
}
