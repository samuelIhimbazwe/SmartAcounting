import { useTranslation } from 'react-i18next'
import { Button } from './Button'

export interface PaginationProps {
  page: number
  totalPages: number
  totalItems?: number
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  disabled = false,
  className = '',
}: PaginationProps) {
  const { t } = useTranslation()
  const safeTotal = Math.max(1, totalPages)
  const current = Math.min(Math.max(1, page), safeTotal)

  return (
    <nav className={`pagination ${className}`.trim()} aria-label={t('pagination.label')}>
      <p className="pagination__info">
        {totalItems !== undefined
          ? t('pagination.showing', { page: current, totalPages: safeTotal, totalItems })
          : t('pagination.pageOf', { page: current, totalPages: safeTotal })}
      </p>
      <div className="pagination__controls">
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || current <= 1}
          onClick={() => onPageChange(1)}
          aria-label={t('pagination.first')}
        >
          {t('pagination.first')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || current <= 1}
          onClick={() => onPageChange(current - 1)}
          aria-label={t('pagination.prev')}
        >
          {t('pagination.prev')}
        </Button>
        <span className="btn btn--sm btn--selected pagination__page" aria-current="page">
          {current} / {safeTotal}
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || current >= safeTotal}
          onClick={() => onPageChange(current + 1)}
          aria-label={t('pagination.next')}
        >
          {t('pagination.next')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || current >= safeTotal}
          onClick={() => onPageChange(safeTotal)}
          aria-label={t('pagination.last')}
        >
          {t('pagination.last')}
        </Button>
      </div>
    </nav>
  )
}
