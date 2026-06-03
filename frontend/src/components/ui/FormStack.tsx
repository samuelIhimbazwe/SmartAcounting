import type { ReactNode } from 'react'
import { cn } from './utils'

export function FormStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('ui-form-stack', className)}>{children}</div>
}
