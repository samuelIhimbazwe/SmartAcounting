import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react'
import { resetPassword } from '../../shared/api/publicSignup'
import { normalizeApiError } from '../../shared/api/errors'
import { AuthLayout } from './AuthLayout'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetPhone = useMemo(() => searchParams.get('phone') ?? '', [searchParams])

  const [phone, setPhone] = useState(presetPhone)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError(t('auth.resetPasswordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.resetPasswordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await resetPassword({ phone: phone.trim(), otp: otp.trim(), newPassword })
      setDone(true)
    } catch (caughtError) {
      setError(normalizeApiError(caughtError).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="auth-card">
          <p className="auth-card__eyebrow">{t('auth.appName')}</p>
          <h1 className="auth-card__title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={26} color="var(--color-success)" strokeWidth={2} />
            {t('auth.resetSuccessTitle')}
          </h1>
          <p className="auth-card__subtitle">{t('auth.resetSuccessBody')}</p>

          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={() => navigate('/login')}
          >
            {t('auth.resetSignInCta')}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <p className="auth-card__eyebrow">{t('auth.appName')}</p>
        <h1 className="auth-card__title">{t('auth.resetTitle')}</h1>
        <p className="auth-card__subtitle">{t('auth.resetSubtitle')}</p>

        {error && (
          <div className="auth-alert" role="alert" aria-live="assertive">
            <AlertCircle size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <label className="auth-field">
          <span className="auth-field__label">{t('auth.resetPhoneLabel')}</span>
          <input
            className="auth-input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+250 7XX XXX XXX"
            required
          />
        </label>

        <label className="auth-field">
          <span className="auth-field__label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} strokeWidth={2} />
              {t('auth.resetOtpLabel')}
            </span>
            <Link to="/forgot-password" className="auth-field__label-secondary">
              {t('auth.resetRequestNewCode')}
            </Link>
          </span>
          <input
            className="auth-input auth-input--otp"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            required
          />
        </label>

        <label className="auth-field">
          <span className="auth-field__label">{t('auth.resetNewPassword')}</span>
          <span className="auth-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
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
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
            {t('auth.signupPasswordHint')}
          </p>
        </label>

        <label className="auth-field">
          <span className="auth-field__label">{t('auth.resetConfirmPassword')}</span>
          <input
            type={showPassword ? 'text' : 'password'}
            className="auth-input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <button
          type="submit"
          className="auth-btn auth-btn--primary"
          disabled={submitting || otp.length !== 6}
          aria-busy={submitting}
        >
          {submitting ? t('auth.resetSubmitting') : t('auth.resetSubmit')}
        </button>

        <p className="auth-card__footer">
          <Link to="/login">
            <ArrowLeft size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
            {t('auth.forgotBack')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
