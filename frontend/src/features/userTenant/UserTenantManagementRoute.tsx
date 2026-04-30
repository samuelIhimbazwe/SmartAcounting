import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { AppShell } from '../../shared/components/layout/AppShell'
import { useAuthStore } from '../../shared/stores/authStore'
import { canManageUsers } from './access'

const UserTenantManagementPage = lazy(async () => {
  const module = await import('./UserTenantManagementPage')
  return { default: module.UserTenantManagementPage }
})

export function UserTenantManagementRoute() {
  const { t } = useTranslation()
  const role = useAuthStore((state) => state.role)
  const accessToken = useAuthStore((state) => state.accessToken)

  if (!role || !accessToken) {
    return <Navigate to="/login" replace />
  }

  if (!canManageUsers(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return (
    <AppShell role={role}>
      <Suspense fallback={<p className="text-sm text-neutral-500">{t('dashboard.loadingModule')}</p>}>
        <UserTenantManagementPage />
      </Suspense>
    </AppShell>
  )
}
