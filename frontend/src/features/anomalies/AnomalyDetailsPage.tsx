import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getDashboardAnomalies } from '../../shared/api/dashboards'
import { escalateAnomaly, markAnomalyReviewed } from '../../shared/api/anomaly'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { HistoryBackButton } from '../../shared/components/navigation/HistoryBackButton'
import { useAuthStore } from '../../shared/stores/authStore'
import type { DashboardAnomaly } from '../../shared/api/dashboards'
import type { Role } from '../../shared/types/roles'
import { rolePathMap } from '../../shared/types/roles'

export function AnomalyDetailsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { anomalyId } = useParams<{ anomalyId: string }>()
  const location = useLocation()
  const role = useAuthStore((state) => state.role) as Role | null
  const permissions = useAuthStore((state) => state.permissions)
  const [escalationNote, setEscalationNote] = useState('')
  const anomalyFromState = (location.state as { anomaly?: DashboardAnomaly } | null)?.anomaly ?? null
  const dashboardPath = role ? `/dashboard/${rolePathMap[role]}` : '/dashboard'

  const query = useQuery({
    queryKey: ['dashboard-anomalies', role],
    queryFn: () => getDashboardAnomalies(role!),
    enabled: Boolean(role),
    staleTime: 60_000,
  })

  const anomaly = anomalyFromState ?? query.data?.find((item) => item.id === anomalyId) ?? null
  const canTakeAction = useMemo(
    () => ['ANALYTICS_OWN', 'ANALYTICS_ALL', 'FINANCE_READ', 'INVENTORY_READ'].some((code) => permissions.includes(code)),
    [permissions],
  )

  const markReviewedMutation = useMutation({
    mutationFn: (caseId: string) => markAnomalyReviewed(caseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard-anomalies', role] })
    },
  })

  const escalateMutation = useMutation({
    mutationFn: ({ caseId, note }: { caseId: string; note?: string }) => escalateAnomaly(caseId, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard-anomalies', role] })
    },
  })

  if (query.isLoading && !anomaly) {
    return <PageSkeleton />
  }

  if (!anomaly) {
    return (
      <div className="page-stack">
        <header>
          <HistoryBackButton
            label="Back"
            fallbackTo={dashboardPath}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm text-[var(--color-brand-700)] underline"
          />
          <h1 className="mt-2">Anomaly details</h1>
          <p className="text-neutral-500">This anomaly is no longer in the active dashboard list.</p>
        </header>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <HistoryBackButton
            label="Back"
            fallbackTo={dashboardPath}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm text-[var(--color-brand-700)] underline"
          />
          <h1 className="mt-2">{anomaly.title}</h1>
          <p className="text-neutral-500">Full anomaly details and any workflow actions currently available.</p>
        </div>
        <span className="rounded-full bg-[var(--surface-overlay)] px-3 py-1 text-xs font-semibold uppercase text-neutral-700">
          {anomaly.severity}
        </span>
      </header>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">What happened</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-700">{anomaly.details || 'No additional details were provided.'}</p>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Anomaly ID</dt>
            <dd className="m-0 mt-1 font-mono text-xs text-neutral-700">{anomaly.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Role context</dt>
            <dd className="m-0 mt-1 text-sm text-neutral-700">{role}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Actions</h2>
        {!canTakeAction ? (
          <p className="mt-2 text-sm text-neutral-500">Your role can review anomaly details, but it does not have anomaly workflow permissions.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              Mark the anomaly as reviewed if it has been investigated, or escalate it into the action queue if it needs broader follow-up.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={markReviewedMutation.isPending || escalateMutation.isPending}
                onClick={() => markReviewedMutation.mutate(anomaly.id)}
              >
                {markReviewedMutation.isPending ? 'Marking…' : 'Mark as reviewed'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium disabled:opacity-60"
                disabled={markReviewedMutation.isPending || escalateMutation.isPending}
                onClick={() => escalateMutation.mutate({ caseId: anomaly.id, note: escalationNote.trim() || undefined })}
              >
                {escalateMutation.isPending ? 'Escalating…' : 'Escalate'}
              </button>
            </div>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Escalation note</span>
              <textarea
                className="min-h-[96px] w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                value={escalationNote}
                onChange={(event) => setEscalationNote(event.target.value)}
                placeholder="Optional note for the action queue."
              />
            </label>
            {markReviewedMutation.isSuccess ? (
              <p className="mt-3 text-sm text-emerald-700">
                Anomaly marked as reviewed. You can return to the dashboard or keep documenting the issue here.
              </p>
            ) : null}
            {escalateMutation.isSuccess ? (
              <p className="mt-3 text-sm text-emerald-700">Anomaly escalated successfully and queued for follow-up.</p>
            ) : null}
            {markReviewedMutation.isError || escalateMutation.isError ? (
              <p className="mt-3 text-sm text-rose-700">The anomaly action failed. Please retry.</p>
            ) : null}
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium"
          onClick={() => navigate(dashboardPath)}
        >
          Return to dashboard
        </button>
      </div>
    </div>
  )
}
