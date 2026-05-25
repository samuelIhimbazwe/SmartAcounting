import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionCard } from '../actions/ActionCard'
import { useExecuteRecommendedAction, useRecommendedActions } from '../actions/useRecommendedActions'
import { getDashboardAlerts } from '../../shared/api/dashboards'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { useAlertStore } from '../../shared/stores/alertStore'
import { useAuthStore } from '../../shared/stores/authStore'
import type { AlertEvent, RecommendedAction } from '../../shared/types/dashboard'
import type { Role } from '../../shared/types/roles'

function formatTimestamp(timestamp: string): string {
  const value = new Date(timestamp)
  return Number.isNaN(value.getTime()) ? timestamp : value.toLocaleString()
}

function scoreActionMatch(alert: AlertEvent, action: RecommendedAction): number {
  let score = 0
  if (alert.targetRoute && action.targetRoute === alert.targetRoute) {
    score += 10
  }
  if (alert.targetApi && action.targetApi === alert.targetApi) {
    score += 10
  }

  const alertTokens = new Set(
    `${alert.title} ${alert.message}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3),
  )
  const actionTokens = new Set(
    `${action.title} ${action.description}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3),
  )

  for (const token of alertTokens) {
    if (actionTokens.has(token)) {
      score += 1
    }
  }
  return score
}

export function AlertDetailsPage() {
  const navigate = useNavigate()
  const { alertId } = useParams<{ alertId: string }>()
  const location = useLocation()
  const role = useAuthStore((state) => state.role) as Role | null
  const alerts = useAlertStore((state) => state.alerts)
  const alertFromState = (location.state as { alert?: AlertEvent } | null)?.alert ?? null
  const alertFromStore = alerts.find((alert) => alert.id === alertId) ?? null

  const alertQuery = useQuery({
    queryKey: ['dashboard-alerts', role],
    queryFn: () => getDashboardAlerts(role!),
    enabled: Boolean(role) && !alertFromState && !alertFromStore,
    staleTime: 60_000,
  })

  const alert = alertFromState ?? alertFromStore ?? alertQuery.data?.find((entry) => entry.id === alertId) ?? null
  const recommendedActions = useRecommendedActions(role ?? 'CEO')
  const executeAction = useExecuteRecommendedAction(role ?? 'CEO')

  const matchedActions = useMemo(() => {
    if (!alert) {
      return []
    }
    return (recommendedActions.data ?? [])
      .map((action) => ({ action, score: scoreActionMatch(alert, action) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.action)
      .slice(0, 3)
  }, [alert, recommendedActions.data])

  if (alertQuery.isLoading && !alert) {
    return <PageSkeleton />
  }

  if (!alert) {
    return (
      <div className="page-stack">
        <header>
          <h1>Alert details</h1>
          <p className="text-neutral-500">This alert is no longer in the current feed.</p>
        </header>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-neutral-600">
            The alert may have expired or been replaced by newer dashboard data.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white"
              onClick={() => navigate(-1)}
            >
              Go back
            </button>
            <Link className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const severityClass: Record<AlertEvent['severity'], string> = {
    LOW: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]',
    MEDIUM: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
    HIGH: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
    CRITICAL: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]',
  }

  return (
    <div className="page-stack">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm">
            <button type="button" className="text-[var(--color-brand-700)] underline" onClick={() => navigate(-1)}>
              Back
            </button>
          </p>
          <h1 className="mt-2">{alert.title}</h1>
          <p className="text-neutral-500">Full alert context, suggested destination, and available actions.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityClass[alert.severity]}`}>
          {alert.severity}
        </span>
      </header>

      <section className="rounded-xl border bg-white p-4">
        <dl className="grid gap-3 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Message</dt>
            <dd className="m-0 mt-1 text-sm text-neutral-800">{alert.message}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Raised</dt>
            <dd className="m-0 mt-1 text-sm text-neutral-800">{formatTimestamp(alert.timestamp)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Role</dt>
            <dd className="m-0 mt-1 text-sm text-neutral-800">{alert.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Source</dt>
            <dd className="m-0 mt-1 text-sm text-neutral-800">{alert.source ?? 'dashboard'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Next step</h2>
        {alert.targetRoute ? (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              This alert points to a related page where you can review more context.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white"
                onClick={() => navigate(alert.targetRoute!)}
              >
                Open related page
              </button>
              <span className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs text-neutral-500">
                {alert.targetRoute}
              </span>
            </div>
          </>
        ) : alert.targetApi ? (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              This alert is backed by an automation endpoint. Use one of the matched actions below to run it safely.
            </p>
            <div className="mt-3 inline-flex items-center rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs text-neutral-500">
              {alert.targetApi}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">
            No direct destination was attached to this alert, but the matched actions below may still help.
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Actions you can take</h2>
        {recommendedActions.isLoading ? (
          <p className="mt-2 text-sm text-neutral-500">Loading actions…</p>
        ) : matchedActions.length > 0 ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {matchedActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                executing={
                  executeAction.isPending &&
                  executeAction.variables?.type === action.type &&
                  executeAction.variables?.id === action.id
                }
                onExecute={(nextAction) => {
                  void executeAction.mutateAsync({ id: nextAction.id, type: nextAction.type })
                }}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No specific workflow action was matched for this alert yet.</p>
        )}
        {executeAction.isError ? (
          <p className="mt-3 text-sm text-rose-700">The action could not be queued. Please retry.</p>
        ) : null}
        {executeAction.isSuccess ? (
          <p className="mt-3 text-sm text-emerald-700">Action queued successfully.</p>
        ) : null}
      </section>
    </div>
  )
}
