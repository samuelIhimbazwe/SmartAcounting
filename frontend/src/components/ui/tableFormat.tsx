import { formatNumber } from '../../shared/utils/intl'
import { formatDate } from '../../shared/utils/intl'
import { Badge, type BadgeVariant } from './Badge'

/** RWF with grouped thousands — e.g. RWF 1,234,567 */
export function formatTableCurrency(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) {
    return '—'
  }
  return `RWF ${formatNumber(Math.round(amount))}`
}

export function formatTableNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—'
  }
  return formatNumber(value)
}

export interface TableDateParts {
  display: string
  title: string
}

export function formatTableDate(value: Date | string | null | undefined): TableDateParts {
  if (!value) {
    return { display: '—', title: '' }
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { display: '—', title: '' }
  }

  const title = formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) {
    return { display: formatDate(date), title }
  }

  const twoHoursMs = 2 * 60 * 60 * 1000
  if (diffMs < twoHoursMs) {
    const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)))
    if (minutes < 60) {
      return {
        display: `${minutes} minute${minutes === 1 ? '' : 's'} ago`,
        title,
      }
    }
    const hours = Math.floor(minutes / 60)
    return {
      display: `${hours} hour${hours === 1 ? '' : 's'} ago`,
      title,
    }
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return { display: 'Yesterday', title }
  }

  return { display: formatDate(date), title }
}

export function TableDateCell({ value }: { value: Date | string | null | undefined }) {
  const { display, title } = formatTableDate(value)
  if (display === '—') {
    return <span>—</span>
  }
  return (
    <span className="ui-table-date" title={title}>
      {display}
    </span>
  )
}

export function TableCurrencyCell({ value }: { value: number | null | undefined }) {
  return <span className="ui-table__num">{formatTableCurrency(value)}</span>
}

export function TableNumberCell({ value }: { value: number | null | undefined }) {
  return <span className="ui-table__num">{formatTableNumber(value)}</span>
}

export function TableStatusBadge({
  value,
  variant,
}: {
  value: string | null | undefined
  variant?: BadgeVariant
}) {
  if (!value) {
    return <span>—</span>
  }
  return <Badge variant={variant ?? statusToBadgeVariant(value)}>{value}</Badge>
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  const normalized = status.toUpperCase().replace(/\s+/g, '_')
  if (['ACTIVE', 'APPROVED', 'PAID', 'COMPLETED', 'SUCCESS', 'POSTED', 'OK'].includes(normalized)) {
    return 'success'
  }
  if (['PENDING', 'DRAFT', 'PROCESSING', 'PARTIAL', 'OPEN'].includes(normalized)) {
    return 'warning'
  }
  if (['FAILED', 'REJECTED', 'CANCELLED', 'CANCELED', 'OVERDUE', 'EXCEEDED', 'ERROR'].includes(normalized)) {
    return 'error'
  }
  if (['INACTIVE', 'CLOSED', 'VOID'].includes(normalized)) {
    return 'neutral'
  }
  return 'info'
}
