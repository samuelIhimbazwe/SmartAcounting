import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardAnomalies } from '../../../shared/api/dashboards'
import { rolesWithAnomalies } from '../../../shared/api/dashboardRoleConfig'
import type { Role } from '../../../shared/types/roles'

export function DashboardAnomaliesPanel({ role }: { role: Role }) {
  const { t } = useTranslation()
  const show = rolesWithAnomalies.includes(role)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-anomalies', role],
    queryFn: () => getDashboardAnomalies(role),
    enabled: show,
    staleTime: 60_000,
  })

  if (!show) {
    return null
  }

  const items = data ?? []

  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {t('dashboard.anomaliesTitle')}
      </h3>
      {isLoading && <p className="mt-2 text-sm text-neutral-500">{t('dashboard.loadingData')}</p>}
      {!isLoading && items.length === 0 && (
        <p className="mt-2 text-sm text-neutral-500">{t('dashboard.anomaliesEmpty')}</p>
      )}
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold text-neutral-900">{item.title}</p>
              <span className="rounded-full bg-[var(--surface-overlay)] px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600">
                {item.severity}
              </span>
            </div>
            {item.details && (
              <p className="m-0 mt-1 text-xs leading-5 text-neutral-600">{item.details}</p>
            )}
          </li>
        ))}
      </ul>
    </article>
  )
}
