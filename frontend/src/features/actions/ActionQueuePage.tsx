import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, ClipboardList, X } from 'lucide-react'
import {
  fetchActionHub,
  processAction,
  type ActionHubItem,
  type ActionHubResponse,
} from '../../shared/api/actionQueue'
import { normalizeApiError } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/stores/authStore'
import { formatDate } from '../../shared/utils/intl'

function relativeTime(iso?: string) {
  if (!iso) {
    return ''
  }
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return ''
  }
  const diffMs = Date.now() - then
  const mins = Math.round(diffMs / 60_000)
  if (mins < 60) {
    return `${Math.max(1, mins)} min ago`
  }
  const hrs = Math.round(mins / 60)
  if (hrs < 48) {
    return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  }
  return formatDate(iso)
}

function priorityClass(priority?: string) {
  switch ((priority ?? 'MEDIUM').toUpperCase()) {
    case 'CRITICAL':
      return 'border-red-300 bg-red-50'
    case 'HIGH':
      return 'border-amber-300 bg-amber-50'
    default:
      return 'border-neutral-200 bg-white'
  }
}

function ActionCard({
  item,
  busy,
  onApprove,
  onReject,
  onCreatePo,
  onDismiss,
  onResolve,
}: {
  item: ActionHubItem
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onCreatePo: () => void
  onDismiss: () => void
  onResolve: () => void
}) {
  const title = item.title ?? item.requestedAction ?? 'Action'
  const lines = item.lines ?? (item.summary ? [item.summary] : [])

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${priorityClass(item.priority)}`}>
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {item.categoryLabel ?? item.category}
      </p>
      <h3 className="m-0 mt-1 text-base font-semibold text-neutral-900">{title}</h3>
      <ul className="m-0 mt-2 list-none space-y-1 p-0 text-sm text-neutral-700">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {(item.requestedBy || item.meta || item.createdAt) && (
        <p className="m-0 mt-2 text-xs text-neutral-500">
          {item.requestedBy ? `Requested by ${item.requestedBy}` : ''}
          {item.requestedBy && item.createdAt ? ' · ' : ''}
          {item.createdAt ? relativeTime(item.createdAt) : item.meta}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {item.category === 'PURCHASE_ORDER' || item.actionType === 'DRAFT_PURCHASE_ORDER' ? (
          <>
            <button type="button" disabled={busy} onClick={onApprove} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white">
              <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Approve
            </button>
            <button type="button" disabled={busy} onClick={onReject} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-800">
              <X className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Reject
            </button>
            {item.viewRoute ? (
              <Link to={item.viewRoute} className="rounded-lg border px-3 py-1.5 text-sm">
                View
              </Link>
            ) : null}
          </>
        ) : null}
        {item.category === 'REORDER' || item.actionType === 'REORDER_SUGGESTION' ? (
          <>
            <button type="button" disabled={busy} onClick={onCreatePo} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white">
              <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {item.source === 'QUEUE' ? 'Approve' : 'Create PO'}
            </button>
            <button type="button" disabled={busy} onClick={onDismiss} className="rounded-lg border px-3 py-1.5 text-sm">
              <X className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Dismiss
            </button>
            {item.viewRoute ? (
              <Link to={item.viewRoute} className="rounded-lg border px-3 py-1.5 text-sm">
                View
              </Link>
            ) : null}
          </>
        ) : null}
        {item.category === 'ANOMALY' || item.source === 'ANOMALY' ? (
          <>
            <Link to={item.viewRoute ?? `/anomalies/${item.id}`} className="rounded-lg border px-3 py-1.5 text-sm">
              Investigate
            </Link>
            <button type="button" disabled={busy} onClick={onResolve} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white">
              Mark resolved
            </button>
          </>
        ) : null}
        {item.category === 'OTHER' && item.source === 'QUEUE' ? (
          <>
            <button type="button" disabled={busy} onClick={onApprove} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white">
              Approve
            </button>
            <button type="button" disabled={busy} onClick={onReject} className="rounded-lg border px-3 py-1.5 text-sm">
              Reject
            </button>
          </>
        ) : null}
      </div>
    </article>
  )
}

export function ActionQueuePage() {
  const role = useAuthStore((s) => s.role)!
  const [hub, setHub] = useState<ActionHubResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [completedOpen, setCompletedOpen] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const data = await fetchActionHub(role)
    setHub(data)
  }, [role])

  useEffect(() => {
    load().catch((e) => setError(normalizeApiError(e).message))
  }, [load])

  const grouped = useMemo(() => {
    const pending = hub?.pending ?? []
    const groups = new Map<string, ActionHubItem[]>()
    for (const item of pending) {
      const key = item.categoryLabel ?? item.category ?? 'OTHER'
      const list = groups.get(key) ?? []
      list.push(item)
      groups.set(key, list)
    }
    return groups
  }, [hub])

  async function handleItem(item: ActionHubItem, decision: string) {
    setBusyId(item.id)
    setError(null)
    try {
      await processAction(item, decision, role)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = hub?.pendingCount ?? 0
  const overdueCount = hub?.overdueCount ?? 0
  const urgent = hub?.urgent ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">Approvals & Actions</h1>
            <p className="m-0 text-sm text-neutral-600">Review pending approvals, reorder suggestions, and anomaly cases.</p>
          </div>
        </div>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-sm font-semibold text-white">
            {pendingCount} pending
          </span>
        ) : null}
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {overdueCount > 0 ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {overdueCount} item{overdueCount === 1 ? '' : 's'} overdue — review urgent actions first.
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">Urgent</h2>
        {urgent.length === 0 ? (
          <p className="text-sm text-neutral-500">No urgent items right now.</p>
        ) : (
          <div className="grid gap-3">
            {urgent.map((item) => (
              <ActionCard
                key={`urgent-${item.source}-${item.id}`}
                item={item}
                busy={busyId === item.id}
                onApprove={() => void handleItem(item, 'APPROVE')}
                onReject={() => void handleItem(item, 'REJECT')}
                onCreatePo={() => void handleItem(item, 'CREATE_PO')}
                onDismiss={() => void handleItem(item, 'DISMISS')}
                onResolve={() => void handleItem(item, 'MARK_RESOLVED')}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Pending approvals</h2>
        {grouped.size === 0 ? (
          <p className="text-sm text-neutral-500">No pending items — you are caught up.</p>
        ) : (
          Array.from(grouped.entries()).map(([groupLabel, items]) => (
            <div key={groupLabel} className="space-y-3">
              <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-neutral-500">{groupLabel}</h3>
              <div className="grid gap-3">
                {items
                  .filter((item) => !urgent.some((u) => u.source === item.source && u.id === item.id))
                  .map((item) => (
                    <ActionCard
                      key={`pending-${item.source}-${item.id}`}
                      item={item}
                      busy={busyId === item.id}
                      onApprove={() => void handleItem(item, 'APPROVE')}
                      onReject={() => void handleItem(item, 'REJECT')}
                      onCreatePo={() => void handleItem(item, 'CREATE_PO')}
                      onDismiss={() => void handleItem(item, 'DISMISS')}
                      onResolve={() => void handleItem(item, 'MARK_RESOLVED')}
                    />
                  ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="rounded-xl border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-neutral-800"
          onClick={() => setCompletedOpen((v) => !v)}
        >
          Completed today
          <span className="flex items-center gap-2 text-neutral-500">
            {(hub?.completedToday ?? []).length} items
            {completedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </button>
        {completedOpen ? (
          <ul className="m-0 list-none border-t p-4 text-sm text-neutral-700">
            {(hub?.completedToday ?? []).length === 0 ? (
              <li className="text-neutral-500">No actions completed today yet.</li>
            ) : (
              hub?.completedToday.map((item) => (
                <li key={`done-${item.id}`} className="border-b border-neutral-100 py-2 last:border-0">
                  <span className="font-medium">{item.title ?? item.categoryLabel}</span>
                  <span className="text-neutral-500"> · {item.status}</span>
                  {item.processedAt ? <span className="text-neutral-400"> · {relativeTime(item.processedAt)}</span> : null}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
