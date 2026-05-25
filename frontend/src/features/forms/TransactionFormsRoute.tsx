import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../../shared/components/layout/AppShell'
import { getDefaultRoute } from '../../shared/routing/getDefaultRoute'
import { useAuthStore } from '../../shared/stores/authStore'

const TransactionFormsPage = lazy(async () => {
  const module = await import('./TransactionFormsPage')
  return { default: module.TransactionFormsPage }
})

const supportedTypes = ['invoice', 'purchase-order', 'sales-order'] as const
type SupportedType = (typeof supportedTypes)[number]
const requiredPermissionByType: Record<SupportedType, string> = {
  invoice: 'FINANCE_WRITE',
  'purchase-order': 'PROCUREMENT_READ',
  'sales-order': 'POS_ACCESS',
}

function isSupportedType(value: string | undefined): value is SupportedType {
  return Boolean(value && supportedTypes.includes(value as SupportedType))
}

export function TransactionFormsRoute() {
  const { t } = useTranslation()
  const { type } = useParams()
  const role = useAuthStore((state) => state.role)!
  const permissions = useAuthStore((state) => state.permissions)
  const effectiveRoleProfile = useAuthStore((state) => state.effectiveRoleProfile)
  const hasPermission = useAuthStore((state) => state.hasPermission)

  if (!isSupportedType(type)) {
    return <Navigate to="/dashboard" replace />
  }

  if (!hasPermission(requiredPermissionByType[type])) {
    return <Navigate to={getDefaultRoute(role, permissions, effectiveRoleProfile)} replace />
  }

  return (
    <AppShell role={role}>
      <Suspense fallback={<p className="text-sm text-neutral-500">{t('dashboard.loadingModule')}</p>}>
        <TransactionFormsPage type={type} />
      </Suspense>
    </AppShell>
  )
}
