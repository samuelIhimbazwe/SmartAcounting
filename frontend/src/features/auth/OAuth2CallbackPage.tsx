import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { applyOAuth2Callback } from './applyOAuth2Callback'
import { useAuthStore } from '../../shared/stores/authStore'

export function OAuth2CallbackPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setSession, setTenantId, setUserId } = useAuthStore()

  useEffect(() => {
    const query: Record<string, string> = {}
    params.forEach((value, key) => {
      query[key] = value
    })

    applyOAuth2Callback(query, navigate, { setSession, setTenantId, setUserId })
  }, [navigate, params, setSession, setTenantId, setUserId])

  return (
    <div className="oauth2-callback">
      <div className="oauth2-callback-spinner">
        <p>{t('auth.oauth2SigningIn')}</p>
      </div>
    </div>
  )
}
