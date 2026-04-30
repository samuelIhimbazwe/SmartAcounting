import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function UnauthorizedPage() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-raised)] p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <h1 className="m-0 text-2xl font-semibold text-neutral-900">{t('errors.accessRestrictedTitle')}</h1>
        <p className="m-0 mt-2 text-neutral-600">{t('errors.accessRestrictedBody')}</p>
        <Link className="mt-4 inline-block rounded-md bg-[var(--color-brand-700)] px-4 py-2 text-white" to="/login">
          {t('errors.backToLogin')}
        </Link>
      </div>
    </main>
  )
}
