import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { API_BASE_URL } from '../../shared/api/config'
import type { OAuth2Provider } from '../../shared/api/auth'
import { desktop, isDesktop } from '../../utils/platform'

interface OAuth2CodeLoginButtonsProps {
  providers: OAuth2Provider[]
  disabled?: boolean
}

export function OAuth2CodeLoginButtons({ providers, disabled }: OAuth2CodeLoginButtonsProps) {
  const { t } = useTranslation()

  if (providers.length === 0) {
    return null
  }

  return (
    <>
      <div className="oauth2-divider">
        <span>{t('auth.loginOr')}</span>
      </div>
      {providers.map((provider) => {
        const authorizePath = provider.loginUrl.startsWith('/')
          ? provider.loginUrl
          : `/${provider.loginUrl}`

        async function onOAuthClick(event: MouseEvent) {
          if (disabled) {
            event.preventDefault()
            return
          }
          if (isDesktop() && desktop?.auth?.startOAuth) {
            event.preventDefault()
            await desktop.auth.startOAuth(API_BASE_URL, authorizePath)
          }
        }

        return (
          <a
            key={provider.provider}
            href={`${API_BASE_URL}${authorizePath}`}
            className="oauth2-button auth-btn"
            aria-disabled={disabled}
            onClick={(event) => {
              void onOAuthClick(event)
            }}
          >
            <span className={`oauth2-button__icon oauth2-button__icon--${provider.provider}`} aria-hidden />
            {provider.displayName}
          </a>
        )
      })}
    </>
  )
}
