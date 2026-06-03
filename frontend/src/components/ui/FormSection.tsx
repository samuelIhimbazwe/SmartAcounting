import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './utils'

export interface FormSectionProps {
  title: string
  children: ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  className?: string
}

export function FormSection({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: FormSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <section className={cn('ui-form-section', className)}>
      {collapsible ? (
        <button
          type="button"
          className="ui-form-section__title ui-form-section__title--toggle"
          onClick={() => setCollapsed(v => !v)}
          aria-expanded={!collapsed}
        >
          {title}
          <ChevronDown className={cn('ui-form-section__chevron', !collapsed && 'ui-form-section__chevron--open')} size={16} />
        </button>
      ) : (
        <h3 className="ui-form-section__title">{title}</h3>
      )}
      {!collapsed ? <div className="ui-form-stack">{children}</div> : null}
    </section>
  )
}
