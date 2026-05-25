import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  selected?: boolean
  children: ReactNode
}

function variantClass(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return 'btn--primary'
    case 'ghost':
      return 'btn--ghost'
    case 'danger':
      return 'btn--danger'
    default:
      return ''
  }
}

export function Button({
  variant = 'default',
  size = 'md',
  selected = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    size === 'sm' ? 'btn--sm' : '',
    variantClass(variant),
    selected ? 'btn--selected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
