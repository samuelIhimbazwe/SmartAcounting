import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, KeyRound, Mail, Phone } from 'lucide-react'
import { forgotPassword } from '../../shared/api/publicSignup'
import { normalizeApiError } from '../../shared/api/errors'
import { AuthLayout } from './AuthLayout'

type Method = 'EMAIL' | 'PHONE'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [method, setMethod] = useState<Method>('EMAIL')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await forgotPassword(
        method === 'EMAIL' ? { email: email.trim() } : { phone: phone.trim() },
      )
      setSent(true)
    } catch (caughtError) {
      setError(normalizeApiError(caughtError).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="auth-card">
          <p className="auth-card__eyebrow">{t('auth.appName')}</p>
          <h1 className="auth-card__title">{t('auth.forgotSuccessTitle')}</h1>
          <p className="auth-card__subtitle">{t('auth.forgotSuccessBody')}</p>

          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={() => {
              const target = method === 'PHONE' ? phone.trim() : ''
              navigate(
                target.length > 0
                  ? `/reset-password?phone=${encodeURIComponent(target)}`
                  : '/reset-password',
              )
            }}
          >
            {t('auth.forgotContinue')}
            <ArrowRight size={16} strokeWidth={2} />
          </button>

          <p className="auth-card__footer">
            <Link to="/login">
              <ArrowLeft size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
              {t('auth.forgotBack')}
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <p className="auth-card__eyebrow">{t('auth.appName')}</p>
        <h1 className="auth-card__title">{t('auth.forgotTitle')}</h1>
        <p className="auth-card__subtitle">{t('auth.forgotSubtitle')}</p>

        {error && (
          <div className="auth-alert" role="alert" aria-live="assertive">
            <AlertCircle size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <div className="plan-billing" role="tablist" aria-label="Reset method" style={{ marginBottom: 18 }}>
          <button
            type="button"
            role="tab"
            aria-selected={method === 'EMAIL'}
            data-active={method === 'EMAIL'}
            onClick={() => setMethod('EMAIL')}
          >
            <Mail size={14} strokeWidth={2} />
            {t('auth.forgotMethodEmail')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === 'PHONE'}
            data-active={method === 'PHONE'}
            onClick={() => setMethod('PHONE')}
          >
            <Phone size={14} strokeWidth={2} />
            {t('auth.forgotMethodPhone')}
          </button>
        </div>

        {method === 'EMAIL' ? (
          <label className="auth-field">
            <span className="auth-field__label">{t('auth.forgotEmailLabel')}</span>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
        ) : (
          <label className="auth-field">
            <span className="auth-field__label">{t('auth.forgotPhoneLabel')}</span>
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
        )}

        <button
          type="submit"
          className="auth-btn auth-btn--primary"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            t('auth.forgotSubmitting')
          ) : (
            <>
              <KeyRound size={16} strokeWidth={2} />
              {t('auth.forgotSubmit')}
            </>
          )}
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
