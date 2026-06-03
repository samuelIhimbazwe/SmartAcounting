import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
  children?: ReactNode
}

function Spinner({ className }: { className?: string }) {
  return <span className={cn('ui-spinner ui-spinner--sm', className)} aria-hidden />
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      className={cn(
        'ui-btn',
        `ui-btn--${variant}`,
        `ui-btn--${size}`,
        fullWidth && 'ui-btn--full',
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className="ui-btn__inner">
        <span className={cn('ui-btn__label', loading && 'ui-btn__label--hidden')}>
          {icon ? <span className="ui-btn__icon">{icon}</span> : null}
          {children}
        </span>
        {loading ? (
          <span className="ui-btn__loader" aria-label="Loading">
            <Spinner />
          </span>
        ) : null}
      </span>
    </button>
  )
}
