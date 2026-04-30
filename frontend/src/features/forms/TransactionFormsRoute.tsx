import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../../shared/components/layout/AppShell'
import { useAuthStore } from '../../shared/stores/authStore'

const TransactionFormsPage = lazy(async () => {
  const module = await import('./TransactionFormsPage')
  return { default: module.TransactionFormsPage }
})

const supportedTypes = ['invoice', 'purchase-order', 'sales-order'] as const
type SupportedType = (typeof supportedTypes)[number]

function isSupportedType(value: string | undefined): value is SupportedType {
  return Boolean(value && supportedTypes.includes(value as SupportedType))
}

export function TransactionFormsRoute() {
  const { t } = useTranslation()
  const { type } = useParams()
  const role = useAuthStore((state) => state.role)
  const accessToken = useAuthStore((state) => state.accessToken)

  if (!role || !accessToken) {
    return <Navigate to="/login" replace />
  }

  if (!isSupportedType(type)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AppShell role={role}>
      <Suspense fallback={<p className="text-sm text-neutral-500">{t('dashboard.loadingModule')}</p>}>
        <TransactionFormsPage type={type} />
      </Suspense>
    </AppShell>
  )
}
