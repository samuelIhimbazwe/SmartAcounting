import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../shared/stores/authStore'
import { pathRoleMap } from '../../shared/types/roles'
import { AppShell } from '../../shared/components/layout/AppShell'
import { useAlertStream } from '../alerts/useAlertStream'
import { DrilldownDrawer } from '../drilldown/DrilldownDrawer'
import { canAccessRoleDashboard } from '../../shared/security/roleAccess'
import type { DashboardPageProps } from './routes/types'
import type { Role } from '../../shared/types/roles'

const roleRouteComponent: Record<Role, LazyExoticComponent<ComponentType<DashboardPageProps>>> = {
  CEO: lazy(() => import('./routes/CeoDashboardPage')),
  CFO: lazy(() => import('./routes/CfoDashboardPage')),
  SALES: lazy(() => import('./routes/SalesDashboardPage')),
  OPERATIONS: lazy(() => import('./routes/OperationsDashboardPage')),
  HR: lazy(() => import('./routes/HrDashboardPage')),
  MARKETING: lazy(() => import('./routes/MarketingDashboardPage')),
  ACCOUNTING: lazy(() => import('./routes/AccountingDashboardPage')),
}

export function DashboardRoute() {
  const { t } = useTranslation()
  const { role: routeRole } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionRole = useAuthStore((state) => state.role)
  const accessToken = useAuthStore((state) => state.accessToken)
  const normalizedRole = routeRole ? pathRoleMap[routeRole] : undefined
  const allowed = Boolean(sessionRole && normalizedRole && canAccessRoleDashboard(sessionRole, normalizedRole))
  const drillMetric = searchParams.get('drill')

  useAlertStream(normalizedRole ?? null, allowed)

  if (!sessionRole || !accessToken) {
    return <Navigate to="/login" replace />
  }

  if (!normalizedRole || !allowed) {
    return <Navigate to="/unauthorized" replace />
  }

  const RoleDashboard = roleRouteComponent[normalizedRole]

  return (
    <AppShell role={sessionRole}>
      <Suspense fallback={<p className="text-sm text-neutral-500">{t('dashboard.loadingModule')}</p>}>
        <RoleDashboard
          onOpenDrilldown={(metric) => {
            const next = new URLSearchParams(searchParams)
            next.set('drill', metric)
            setSearchParams(next, { replace: true })
          }}
        />
      </Suspense>
      <DrilldownDrawer
        role={normalizedRole}
        metric={drillMetric}
        onClose={() => {
          const next = new URLSearchParams(searchParams)
          next.delete('drill')
          setSearchParams(next, { replace: true })
        }}
      />
    </AppShell>
  )
}
