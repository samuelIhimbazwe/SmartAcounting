import type { ReactNode } from 'react'
import { cn } from './utils'

export interface FormActionsProps {
  children: ReactNode
  sticky?: boolean
  className?: string
}

export function FormActions({ children, sticky = false, className }: FormActionsProps) {
  return (
    <div className={cn('ui-form-actions', sticky && 'ui-form-actions--sticky', className)}>
      {children}
    </div>
  )
}
