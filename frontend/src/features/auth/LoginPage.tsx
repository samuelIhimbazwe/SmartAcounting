import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react'
import { login } from '../../shared/api/auth'
import { isApiError, normalizeApiError } from '../../shared/api/errors'
import { resolvePostLoginRoute } from '../../shared/routing/postLoginRoute'
import { useAuthStore } from '../../shared/stores/authStore'
import { AuthLayout } from './AuthLayout'

export function LoginPage() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      setSession({
        role: response.role,
        permissions: response.permissions,
        assignedRoles: response.assignedRoles,
        effectiveRoleProfile: response.effectiveRoleProfile,
        setupComplete: response.setupComplete,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
        tenantId: response.tenantId,
        userId: response.userId,
      })
      if (response.tenantId) {
        setTenantId(response.tenantId)
      }
      navigate(
        resolvePostLoginRoute(
          response.setupComplete,
          response.role,
          response.permissions,
          response.assignedRoles,
          response.effectiveRoleProfile,
        ),
      )
    } catch (caughtError) {
      const apiError = normalizeApiError(caughtError)
      if (isApiError(apiError) && apiError.status === 401) {
        setError(t('auth.invalidCredentials'))
      } else {
        setError(apiError.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="auth-card__eyebrow">{t('auth.appName')}</p>
        <h1 className="auth-card__title">{t('auth.loginWelcomeBack')}</h1>
        <p className="auth-card__subtitle">{t('auth.loginIntro')}</p>

        {error && (
          <div className="auth-alert" role="alert" aria-live="assertive">
            <AlertCircle size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <label className="auth-field">
          <span className="auth-field__label">{t('auth.usernameLabel')}</span>
          <input
            type="text"
            className="auth-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            aria-invalid={Boolean(error)}
          />
        </label>

        <label className="auth-field">
          <span className="auth-field__label">
            {t('auth.passwordLabel')}
            <Link to="/forgot-password" className="auth-field__label-secondary">
              {t('auth.loginForgotPassword')}
            </Link>
          </span>
          <span className="auth-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              aria-invalid={Boolean(error)}
            />
            <button
              type="button"
              className="auth-input__toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t('auth.loginHidePassword') : t('auth.loginShowPassword')}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>

        <details className="auth-advanced">
          <summary className="auth-advanced__summary">{t('auth.loginAdvancedToggle')}</summary>
          <p className="auth-advanced__hint">{t('auth.loginAdvancedHelper')}</p>
          <label className="auth-field">
            <span className="auth-field__label">{t('auth.tenantLabel')}</span>
            <input
              className="auth-input"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              autoComplete="organization"
            />
          </label>
        </details>

        <button
          type="submit"
          className="auth-btn auth-btn--primary"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            t('auth.signingIn')
          ) : (
            <>
              <LogIn size={16} strokeWidth={2} />
              {t('auth.signIn')}
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>

        <p className="auth-card__footer">
          {t('auth.loginNewHere')}{' '}
          <Link to="/signup">{t('auth.loginCreateLink')}</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
