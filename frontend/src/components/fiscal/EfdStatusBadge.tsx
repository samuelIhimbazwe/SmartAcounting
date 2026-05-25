import { useEfdQueue } from '../../hooks/useEfdQueue'

export function EfdStatusBadge() {
  const { pendingCount, displayStatus, retryNow } = useEfdQueue()

  if (displayStatus === 'pending' || pendingCount > 0) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
        role="status"
      >
        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
        {pendingCount} pending
        <button
          type="button"
          className="underline hover:no-underline"
          onClick={() => void retryNow()}
        >
          Retry
        </button>
      </span>
    )
  }

  if (displayStatus === 'error') {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-900"
        role="status"
      >
        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
        Fiscal error
        <button
          type="button"
          className="underline hover:no-underline"
          onClick={() => void retryNow()}
        >
          Retry
        </button>
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
      role="status"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      Fiscal OK
    </span>
  )
}
