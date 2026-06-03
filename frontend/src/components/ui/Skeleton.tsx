import { cn } from './utils'

export type SkeletonVariant = 'text' | 'circle' | 'rect'

export interface SkeletonProps {
  width?: number | string
  height?: number | string
  variant?: SkeletonVariant
  className?: string
}

export function Skeleton({ width, height, variant = 'text', className }: SkeletonProps) {
  const style = {
    width: width ?? (variant === 'circle' ? 40 : '100%'),
    height: height ?? (variant === 'circle' ? 40 : variant === 'text' ? '1em' : 48),
  }

  return (
    <span
      className={cn('ui-skeleton', `ui-skeleton--${variant}`, className)}
      style={style}
      aria-hidden
    />
  )
}
