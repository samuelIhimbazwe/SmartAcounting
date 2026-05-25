import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../shared/components/layout/AppShell'
import { useAuthStore } from '../../shared/stores/authStore'

const UserTenantManagementPage = lazy(async () => {
  const module = await import('./UserTenantManagementPage')
  return { default: module.UserTenantManagementPage }
})

export function UserTenantManagementRoute() {
  const { t } = useTranslation()
  const role = useAuthStore((state) => state.role)!

  return (
    <AppShell role={role}>
      <Suspense fallback={<p className="text-sm text-neutral-500">{t('dashboard.loadingModule')}</p>}>
        <UserTenantManagementPage />
      </Suspense>
    </AppShell>
  )
}
