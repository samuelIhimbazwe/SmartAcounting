import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { login } from '../../shared/api/auth'
import { isApiError, normalizeApiError } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/stores/authStore'
import { rolePathMap, roles, type Role } from '../../shared/types/roles'

export function LoginPage() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('ceo')
  const [password, setPassword] = useState('password')
  const [selectedRole, setSelectedRole] = useState<Role>('CEO')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { tenantId, userId, setSession, setTenantId } = useAuthStore()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await login({ username, password, tenantId, userId })
      const role = response.role ?? selectedRole
      setSession({
        role,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
        tenantId: response.tenantId,
        userId: response.userId,
      })
      if (response.tenantId) {
        setTenantId(response.tenantId)
      }
      navigate(`/dashboard/${rolePathMap[role]}`)
    } catch (caughtError) {
      const apiError = normalizeApiError(caughtError)
      setError(apiError.message)
      if (isApiError(apiError) && apiError.status === 401) {
        setError(t('auth.invalidCredentials'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-raised)] p-4">
      <form
        className="w-full max-w-md space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-[var(--shadow-card)]"
        onSubmit={onSubmit}
      >
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-[var(--color-brand-900)]">{t('auth.appName')}</h1>
          <p className="m-0 mt-1 text-sm text-neutral-600">{t('auth.loginSubtitle')}</p>
        </div>

        <label className="block text-sm">
          {t('auth.tenantLabel')}
          <input
            id="tenant-id"
            className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            autoComplete="organization"
            required
          />
        </label>

        <label className="block text-sm">
          {t('auth.usernameLabel')}
          <input
            id="username"
            className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </label>

        <label className="block text-sm">
          {t('auth.passwordLabel')}
          <input
            id="password"
            className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </label>

        <label className="block text-sm">
          {t('auth.roleLabel')}
          <select
            id="role"
            className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as Role)}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p id="login-error" className="m-0 text-xs text-amber-700" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-brand-700)] px-3 py-2 font-medium text-white disabled:opacity-70"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
    </main>
  )
}
