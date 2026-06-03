import type { ReactNode } from 'react'
import { cn, sentenceCase } from './utils'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children?: ReactNode
  className?: string
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  const label = typeof children === 'string' ? sentenceCase(children) : children

  if (dot && !children) {
    return (
      <span
        className={cn('ui-badge', `ui-badge--${variant}`, `ui-badge--${size}`, 'ui-badge--dot-only', className)}
        aria-hidden
      >
        <span className="ui-badge__dot" />
      </span>
    )
  }

  if (dot) {
    return (
      <span className={cn('ui-badge', `ui-badge--${variant}`, `ui-badge--${size}`, className)}>
        <span className="ui-badge__dot" aria-hidden />
        {label}
      </span>
    )
  }

  return (
    <span className={cn('ui-badge', `ui-badge--${variant}`, `ui-badge--${size}`, className)}>
      {label}
    </span>
  )
}
