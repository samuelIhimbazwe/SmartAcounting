import { useMsal } from '@azure/msal-react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'
import { isDesktop } from '../../../utils/platform'
import { isGoogleOAuthConfigured, isMicrosoftOAuthConfigured } from './AuthOAuthProviders'

export type OAuthProviderId = 'google' | 'microsoft'

export interface SocialAuthButtonsProps {
  /** Called with a verified ID token string from the IdP (Google JWT or Microsoft id_token). */
  onIdToken: (provider: OAuthProviderId, idToken: string) => void
  disabled?: boolean
}

export function SocialAuthButtons({ onIdToken, disabled }: SocialAuthButtonsProps) {
  const { t } = useTranslation()

  if (isDesktop()) {
    return null
  }

  const googleOn = isGoogleOAuthConfigured()
  const microsoftOn = isMicrosoftOAuthConfigured()

  if (!googleOn && !microsoftOn) {
    return (
      <div className="auth-sso" aria-hidden="true">
        <button type="button" disabled title={t('auth.loginSsoComingSoon')}>
          <span className="sso-badge">{t('auth.loginSsoComingSoon')}</span>
          {t('auth.loginSsoGoogle')}
        </button>
        <button type="button" disabled title={t('auth.loginSsoComingSoon')}>
          <span className="sso-badge">{t('auth.loginSsoComingSoon')}</span>
          {t('auth.loginSsoMicrosoft')}
        </button>
      </div>
    )
  }

  return (
    <div className="auth-sso">
      {googleOn && (
        <span className="auth-sso__google">
          <GoogleLogin
            type="standard"
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            locale="en"
            onSuccess={(cred: CredentialResponse) => {
              if (cred.credential) {
                onIdToken('google', cred.credential)
              }
            }}
            onError={() => {
              /* user closed popup or network */
            }}
            useOneTap={false}
          />
        </span>
      )}
      {microsoftOn && <MicrosoftPopupButton onIdToken={onIdToken} disabled={disabled} />}
    </div>
  )
}

function MicrosoftPopupButton({
  onIdToken,
  disabled,
}: {
  onIdToken: (provider: OAuthProviderId, idToken: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { instance } = useMsal()

  return (
    <button
      type="button"
      className="auth-sso__microsoft"
      disabled={disabled}
      onClick={() => {
        void (async () => {
          try {
            const result = await instance.loginPopup({
              scopes: ['openid', 'profile', 'email'],
            })
            if (result.idToken) {
              onIdToken('microsoft', result.idToken)
            }
          } catch {
            /* user closed popup or IdP error */
          }
        })()
      }}
    >
      {t('auth.loginSsoMicrosoft')}
    </button>
  )
}
