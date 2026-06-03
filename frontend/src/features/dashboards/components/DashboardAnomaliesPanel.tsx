import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, EmptyState, Skeleton } from '../../../components/ui'
import { getDashboardAnomalies } from '../../../shared/api/dashboards'
import { rolesWithAnomalies } from '../../../shared/api/dashboardRoleConfig'
import type { Role } from '../../../shared/types/roles'

export function DashboardAnomaliesPanel({ role, compact = false }: { role: Role; compact?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
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

  const items = (data ?? []).slice(0, 6)

  if (compact) {
    return (
      <article className="dash-panel dash-anomalies--compact">
        <header className="dash-panel__head">
          <h3 className="dash-panel__title">{t('dashboard.anomaliesTitle')}</h3>
        </header>
        {isLoading ? (
          <div className="dash-panel__loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="text" height={40} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('dashboard.anomaliesEmpty')}
            description={t('dashboard.panelEmptyBody')}
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/actions')}>
                {t('dashboard.viewActions')}
              </Button>
            }
          />
        ) : (
          <ul className="dash-panel__list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="dash-anomaly-row"
                  onClick={() => navigate(`/anomalies/${item.id}`, { state: { anomaly: item } })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                    <p className="dash-anomaly-row__title">{item.title}</p>
                    <Badge variant="warning" size="sm">
                      {item.severity}
                    </Badge>
                  </div>
                  {item.details ? <p className="dash-anomaly-row__detail">{item.details}</p> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    )
  }

  return (
    <article className="dash-panel">
      <header className="dash-panel__head">
        <h3 className="dash-panel__title">{t('dashboard.anomaliesTitle')}</h3>
      </header>
      {isLoading && (
        <div className="dash-panel__loading">
          <Skeleton variant="text" height={14} />
        </div>
      )}
      {!isLoading && items.length === 0 && (
        <EmptyState title={t('dashboard.anomaliesEmpty')} description={t('dashboard.panelEmptyBody')} />
      )}
      <ul className="dash-panel__list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="dash-anomaly-row"
              onClick={() => navigate(`/anomalies/${item.id}`, { state: { anomaly: item } })}
            >
              <p className="dash-anomaly-row__title">{item.title}</p>
              {item.details && <p className="dash-anomaly-row__detail">{item.details}</p>}
            </button>
          </li>
        ))}
      </ul>
    </article>
  )
}
