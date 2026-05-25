import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Eye, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react'
import { fetchOAuth2Providers, type OAuth2Provider } from '../../shared/api/auth'
import { isApiError, normalizeApiError } from '../../shared/api/errors'
import {
  type SignupOtpDelivery,
  publicOAuthSignup,
  publicSignup,
  resendSignupOtp,
  verifySignupPhone,
} from '../../shared/api/publicSignup'
import { detectRwandaMobileCarrier, maskPhoneForDisplay } from '../../utils/phoneValidation'
import { useAuthStore } from '../../shared/stores/authStore'
import { rolePathMap } from '../../shared/types/roles'
import { isDesktop } from '../../utils/platform'
import { AuthLayout } from './AuthLayout'
import { OAuth2CodeLoginButtons } from './OAuth2CodeLoginButtons'
import { decodeIdTokenClaims } from './oauth/decodeIdTokenClaims'
import { SocialAuthButtons, type OAuthProviderId } from './oauth/SocialAuthButtons'
import { PlanSelector } from './PlanSelector'
import {
  type BillingCycle,
  type PlanId,
  formatFrw,
  persistIntendedPlan,
  planById,
} from './subscriptionPlans'

type Step = 'plan' | 'form' | 'verify'

const STEP_KEYS: Record<Step, string> = {
  plan: 'auth.signupStepPlan',
  form: 'auth.signupStepAccount',
  verify: 'auth.signupStepVerify',
}

const STEP_ORDER: Step[] = ['plan', 'form', 'verify']
const RESEND_COOLDOWN_SEC = 60

export function SignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setSession, setTenantId, setUserId } = useAuthStore()

  const [step, setStep] = useState<Step>('plan')
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('PROFESSIONAL')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('ANNUAL')

  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [otp, setOtp] = useState('')
  const [pendingTenantId, setPendingTenantId] = useState('')
  const [pendingUserId, setPendingUserId] = useState('')
  const [pendingPhone, setPendingPhone] = useState('')

  const [oauthSignup, setOauthSignup] = useState<{ provider: OAuthProviderId; idToken: string } | null>(null)
  const [oauth2Providers, setOauth2Providers] = useState<OAuth2Provider[] | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [maskedPhone, setMaskedPhone] = useState('')
  const [smsDelivery, setSmsDelivery] = useState<SignupOtpDelivery['smsDelivery']>()
  const [smsCarrier, setSmsCarrier] = useState<SignupOtpDelivery['smsCarrier']>()
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showDidntReceive, setShowDidntReceive] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const useOAuth2CodeFlow = oauth2Providers !== null && oauth2Providers.length > 0
  const displayPhone = maskedPhone || maskPhoneForDisplay(pendingPhone)

  function applyOtpDelivery(delivery: SignupOtpDelivery, phoneNumber?: string) {
    const resolvedPhone = phoneNumber ?? pendingPhone
    if (delivery.maskedPhone) {
      setMaskedPhone(delivery.maskedPhone)
    } else if (resolvedPhone) {
      setMaskedPhone(maskPhoneForDisplay(resolvedPhone))
    }
    setSmsDelivery(delivery.smsDelivery)
    setSmsCarrier(delivery.smsCarrier)
    setDevOtp(delivery.devOtp ?? null)
    if (delivery.smsDelivery !== 'SENT') {
      setShowDidntReceive(true)
    }
  }

  useEffect(() => {
    if (step !== 'form') {
      return
    }
    fetchOAuth2Providers()
      .then(setOauth2Providers)
      .catch(() => setOauth2Providers([]))
  }, [step])

  useEffect(() => {
    if (step !== 'verify' || resendCooldown <= 0) {
      return
    }
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step, resendCooldown])

  async function onSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!oauthSignup) {
      if (password !== confirmPassword) {
        setError(t('auth.signupPasswordMismatch'))
        return
      }
      if (password.length < 8) {
        setError(t('auth.signupPasswordTooShort'))
        return
      }
    }
    setSubmitting(true)
    try {
      persistIntendedPlan(selectedPlan, billingCycle)
      const res = oauthSignup
        ? await publicOAuthSignup({
            provider: oauthSignup.provider,
            idToken: oauthSignup.idToken,
            businessName: businessName.trim(),
            ownerName: ownerName.trim(),
            phone: phone.trim(),
            plan: selectedPlan,
            billingCycle,
          })
        : await publicSignup({
            businessName: businessName.trim(),
            ownerName: ownerName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
            plan: selectedPlan,
            billingCycle,
          })
      const normalizedPhone = phone.trim()
      setPendingTenantId(res.tenantId)
      setPendingUserId(res.userId)
      setPendingPhone(normalizedPhone)
      applyOtpDelivery(res, normalizedPhone)
      setResendCooldown(RESEND_COOLDOWN_SEC)
      setResendSuccess(false)
      setShowDidntReceive(false)
      setStep('verify')
      setOtp('')
    } catch (caughtError) {
      const apiError = normalizeApiError(caughtError)
      let message = apiError.message
      if (isApiError(apiError) && apiError.status === 409) {
        message = t('auth.signupConflict')
      }
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function onSubmitVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const session = await verifySignupPhone(pendingPhone, otp.trim())
      setTenantId(pendingTenantId)
      setUserId(pendingUserId)
      setSession({
        role: session.role,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      })
      navigate(`/dashboard/${rolePathMap[session.role]}`)
    } catch (caughtError) {
      const apiError = normalizeApiError(caughtError)
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function onResend() {
    if (resendCooldown > 0 || resending) {
      return
    }
    setError(null)
    setResendSuccess(false)
    setResending(true)
    try {
      const delivery = await resendSignupOtp(pendingPhone)
      applyOtpDelivery(delivery)
      setResendCooldown(RESEND_COOLDOWN_SEC)
      setResendSuccess(true)
      setOtp('')
    } catch (caughtError) {
      const apiError = normalizeApiError(caughtError)
      setError(apiError.message)
    } finally {
      setResending(false)
    }
  }

  if (step === 'plan') {
    return (
      <AuthLayout wide>
        <Stepper current={step} />
        <PlanSelector
          selectedPlan={selectedPlan}
          billingCycle={billingCycle}
          onSelectPlan={setSelectedPlan}
          onBillingChange={setBillingCycle}
          onContinue={() => {
            persistIntendedPlan(selectedPlan, billingCycle)
            setStep('form')
            setError(null)
            setOauthSignup(null)
          }}
        />
        <p className="auth-card__footer" style={{ marginTop: 18 }}>
          {t('auth.signupAlreadyHaveAccount')}{' '}
          <Link to="/login">{t('auth.signIn')}</Link>
        </p>
      </AuthLayout>
    )
  }

  if (step === 'form') {
    return (
      <AuthLayout>
        <Stepper current={step} />
        <form className="auth-card" onSubmit={onSubmitForm} noValidate>
          <p className="auth-card__eyebrow">{t('auth.signupStepProgress', { current: 2, total: 3 })}</p>
          <h1 className="auth-card__title">{t('auth.signupAccountTitle')}</h1>
          <p className="auth-card__subtitle">{t('auth.signupAccountSubtitle')}</p>

          <PlanSummary
            planId={selectedPlan}
            cycle={billingCycle}
            onChange={() => {
              setStep('plan')
              setError(null)
              setOauthSignup(null)
            }}
          />

          {oauth2Providers === null ? null : useOAuth2CodeFlow ? (
            <>
              <OAuth2CodeLoginButtons providers={oauth2Providers} disabled={submitting} />
              {isDesktop() && (
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                  {t('auth.signupDesktopOAuthHint')}
                </p>
              )}
            </>
          ) : (
            <SocialAuthButtons
              disabled={submitting}
              onIdToken={(provider, idToken) => {
                const claims = decodeIdTokenClaims(idToken)
                setOauthSignup({ provider, idToken })
                if (claims.email) {
                  setEmail(claims.email)
                }
                if (claims.name) {
                  setOwnerName(claims.name)
                }
                setPassword('')
                setConfirmPassword('')
                setError(null)
              }}
            />
          )}

          {isDesktop() && oauth2Providers !== null && oauth2Providers.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {t('auth.desktopOAuthNotConfigured')}
            </p>
          )}

          <div className="auth-card__divider">{t('auth.signupOrEmailPassword')}</div>

          {oauthSignup && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 0, marginBottom: 8 }}>
              {t('auth.signupOAuthHint', { provider: oauthSignup.provider === 'google' ? 'Google' : 'Microsoft' })}
            </p>
          )}
          {oauthSignup && (
            <button
              type="button"
              className="auth-btn auth-btn--link"
              style={{ marginBottom: 12, padding: 0 }}
              onClick={() => {
                setOauthSignup(null)
                setError(null)
              }}
            >
              {t('auth.signupUsePasswordInstead')}
            </button>
          )}
          {error && (
            <div className="auth-alert" role="alert" aria-live="assertive">
              <AlertCircle size={16} strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          <div className="auth-row auth-row--2">
            <label className="auth-field">
              <span className="auth-field__label">{t('auth.signupBusinessName')}</span>
              <input
                className="auth-input"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                autoComplete="organization"
                required
              />
            </label>

            <label className="auth-field">
              <span className="auth-field__label">{t('auth.signupOwnerName')}</span>
              <input
                className="auth-input"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          </div>

          <div className="auth-row auth-row--2">
            <label className="auth-field">
              <span className="auth-field__label">{t('auth.usernameLabel')}</span>
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                readOnly={Boolean(oauthSignup)}
                required
              />
            </label>

            <label className="auth-field">
              <span className="auth-field__label">{t('auth.signupPhone')}</span>
              <input
                className="auth-input"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+250 7XX XXX XXX"
                required
              />
              {(() => {
                const carrier = detectRwandaMobileCarrier(phone)
                if (carrier === 'UNKNOWN') {
                  return null
                }
                return (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                    {t('auth.signupPhoneCarrierHint', {
                      carrier: carrier === 'MTN' ? 'MTN' : 'Airtel',
                    })}
                  </p>
                )
              })()}
            </label>
          </div>

          {!oauthSignup && (
            <>
              <label className="auth-field">
                <span className="auth-field__label">{t('auth.passwordLabel')}</span>
                <span className="auth-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
                <span className="auth-field__label">{t('auth.signupConfirmPassword')}</span>
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
            </>
          )}
          <p className="plan-footer-note" style={{ marginBottom: 16 }}>{t('auth.signupTrialNote')}</p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="auth-btn auth-btn--ghost"
              onClick={() => {
                setStep('plan')
                setError(null)
                setOauthSignup(null)
              }}
              style={{ width: 'auto', flex: '0 0 auto', padding: '0 18px' }}
            >
              {t('auth.signupStepBack')}
            </button>
            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                t('auth.signupSubmitting')
              ) : (
                <>
                  {t('auth.signupContinue')}
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </div>

          <p className="auth-card__footer">
            <Link to="/login">{t('auth.signupAlreadyHaveAccount')}</Link>
          </p>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Stepper current={step} />
      <form className="auth-card" onSubmit={onSubmitVerify} noValidate>
        <p className="auth-card__eyebrow">{t('auth.signupStepProgress', { current: 3, total: 3 })}</p>
        <h1 className="auth-card__title">{t('auth.verifyTitle')}</h1>
        <p className="auth-card__subtitle">
          {smsCarrier && smsCarrier !== 'UNKNOWN'
            ? t('auth.verifySubtitleCarrier', {
                phone: displayPhone,
                carrier: smsCarrier === 'MTN' ? 'MTN' : 'Airtel',
              })
            : t('auth.verifySubtitle', { phone: displayPhone })}
        </p>

        {devOtp && (
          <div className="auth-verify-dev-code" role="status">
            <p>
              {smsCarrier && smsCarrier !== 'UNKNOWN'
                ? t('auth.verifySmsDryRunCarrier', {
                    carrier: smsCarrier === 'MTN' ? 'MTN' : 'Airtel',
                  })
                : t('auth.verifySmsDryRun')}
            </p>
            <strong aria-label={t('auth.verifyOtpLabel')}>{devOtp}</strong>
          </div>
        )}

        {!devOtp && smsDelivery === 'FAILED' && (
          <div className="auth-alert" role="status">
            <AlertCircle size={16} strokeWidth={2} />
            <span>{t('auth.verifySmsFailed')}</span>
          </div>
        )}

        {!devOtp && smsDelivery === 'DISABLED' && (
          <div className="auth-alert" role="status">
            <AlertCircle size={16} strokeWidth={2} />
            <span>{t('auth.verifySmsDisabled')}</span>
          </div>
        )}

        {resendSuccess && (
          <p className="auth-verify-success" role="status">
            {t('auth.verifyResendSuccess')}
          </p>
        )}

        {error && (
          <div className="auth-alert" role="alert" aria-live="assertive">
            <AlertCircle size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <label className="auth-field">
          <span className="auth-field__label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} strokeWidth={2} />
              {t('auth.verifyOtpLabel')}
            </span>
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
            aria-invalid={Boolean(error)}
          />
        </label>

        <button
          type="submit"
          className="auth-btn auth-btn--primary"
          disabled={submitting || otp.length !== 6}
          aria-busy={submitting}
        >
          {submitting ? t('auth.verifySubmitting') : t('auth.verifySubmit')}
        </button>

        <div className="auth-verify-help">
          <button
            type="button"
            className="auth-verify-help__toggle"
            aria-expanded={showDidntReceive}
            onClick={() => setShowDidntReceive((open) => !open)}
          >
            {t('auth.verifyDidntReceive')}
          </button>
          {showDidntReceive && (
            <div className="auth-verify-help__panel">
              <ul>
                <li>{t('auth.verifyHelpWait')}</li>
                <li>{t('auth.verifyHelpCheckNumber', { phone: displayPhone })}</li>
                <li>{t('auth.verifyHelpTryAgain')}</li>
              </ul>
              <div className="auth-verify-help__actions">
                <button
                  type="button"
                  className="auth-btn auth-btn--ghost"
                  onClick={() => {
                    void onResend()
                  }}
                  disabled={resending || resendCooldown > 0}
                >
                  <RefreshCw size={14} strokeWidth={2} />
                  {resending
                    ? t('auth.verifyResending')
                    : resendCooldown > 0
                      ? t('auth.verifyResendIn', { seconds: resendCooldown })
                      : t('auth.verifyResend')}
                </button>
                <button
                  type="button"
                  className="auth-btn auth-btn--link"
                  onClick={() => {
                    setStep('form')
                    setError(null)
                    setResendSuccess(false)
                  }}
                >
                  {t('auth.verifyBack')}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="auth-card__footer">
          <Link to="/login">{t('auth.signupAlreadyHaveAccount')}</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

interface StepperProps {
  current: Step
}

function Stepper({ current }: StepperProps) {
  const { t } = useTranslation()
  const currentIndex = STEP_ORDER.indexOf(current)
  return (
    <div className="plan-stepper" aria-label="Signup progress">
      {STEP_ORDER.map((stepKey, idx) => {
        const state =
          idx < currentIndex ? 'done' : idx === currentIndex ? 'active' : 'pending'
        return (
          <span key={stepKey} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, flex: idx === STEP_ORDER.length - 1 ? '0 0 auto' : '1 1 auto' }}>
            <span className="plan-stepper__pill" data-state={state}>
              <span className="plan-stepper__pill__index">{idx + 1}</span>
              {t(STEP_KEYS[stepKey])}
            </span>
            {idx < STEP_ORDER.length - 1 && <span className="plan-stepper__divider" />}
          </span>
        )
      })}
    </div>
  )
}

interface PlanSummaryProps {
  planId: PlanId
  cycle: BillingCycle
  onChange: () => void
}

function PlanSummary({ planId, cycle, onChange }: PlanSummaryProps) {
  const { t } = useTranslation()
  const plan = planById(planId)
  const price = cycle === 'ANNUAL' ? plan.annualPriceFrw : plan.monthlyPriceFrw

  return (
    <div className="plan-summary">
      <div>
        <div className="plan-summary__label">{t('auth.signupSelectedPlan')}</div>
        <div className="plan-summary__value">
          {t(plan.nameKey)}{' '}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            ·{' '}
            {cycle === 'ANNUAL' ? t('auth.planBillingAnnual') : t('auth.planBillingMonthly')}
            {price != null && ` · FRW ${formatFrw(price)}${t('auth.planPerMonth')}`}
            {price == null && ` · ${t('auth.planContactSales')}`}
          </span>
        </div>
      </div>
      <button type="button" className="auth-btn auth-btn--link" onClick={onChange}>
        {t('auth.signupChangePlan')}
      </button>
    </div>
  )
}
